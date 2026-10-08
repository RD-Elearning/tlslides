/**
 * LO0 — `measureBlock`: a block's *natural* size, read straight off its `LayoutNode` tree.
 *
 * Why not the root box: many blocks return `max(region, content)` as their root height
 * (block-library README hard-won fact 6), and `compileSlide` sizes a block by that root, so the
 * root box says "how much room I was given", not "how much room my content needs". The painted
 * leaves (text/image/icon/path/line/rect) do not lie: their union bbox is what the viewer sees.
 *
 * Probe strategy (deviation from the plan's "minimal height probe", see layout-oracle §3 Notes):
 * a block is laid out at the requested width and a *tall* probe height. A minimal probe would
 * trigger autofit (`tls.t.title` shrinks its type until it fits the box) and report a shrunk,
 * not a natural, height. A second, taller probe tells content-sized blocks apart from blocks
 * that fill whatever box they get (charts, images): when the painted union grows with the probe
 * the block is `elastic` and its natural size is the one it paints at `opts.height` (or its
 * preferred height) instead.
 *
 * Coordinates follow the DOM renderer (the editor): a group's children are positioned relative
 * to the group's own origin, and a `host` node's poster relative to the host box.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type {
  BlockDefinition,
  BlockKind,
  Box,
  LayoutContext,
  LayoutNode,
  Size,
} from '../types'
import { createLayoutContext, layoutBlock } from './layout-child'
import { estimateMetrics } from './measure'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Types                                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** How far the measured geometry can be trusted (layout-oracle §LO0). */
export type MeasureConfidence = 'high' | 'medium' | 'low'

/** One painted leaf, in block-local coordinates (block origin = 0,0). */
export interface PaintedLeaf {
  k: LayoutNode['k']
  part?: string
  box: Box
}

/** One text leaf: what the text needs, in block-local coordinates. */
export interface TextLeafMeasure {
  part?: string
  propPath?: string
  /** Number of laid-out (visual) lines, after wrapping. */
  lines: number
  /** One line's height in slide units (font size × line-height multiplier, after autofit). */
  lineHeight: number
  /** Effective font size in slide units (after autofit). */
  fontSize: number
  /** Autofit scale (`style.scale`); 1 = not shrunk. */
  scale: number
  /** Widest laid-out line, in slide units. */
  maxLineWidth: number
  /** Characters across all lines (whitespace at line breaks excluded). */
  chars: number
  /** How many characters of this text's average glyph width fit one line of `box.width`. */
  charsPerLine: number
  /** The text node's own box (the width it wraps at). */
  box: Box
  /** The painted extent: first line top to last line bottom, widest line. */
  painted: Box
}

export interface BlockMeasure {
  type: string
  kind: BlockKind
  /** The width the block was laid out at. */
  width: number
  /** The height of the box the reported geometry was laid out in. */
  probeHeight: number
  /** Union bbox size of the painted leaves (full-box backdrops excluded). `{width, 0}` when
   *  nothing painted. */
  natural: Size
  /** The same union bbox with its block-local position; `null` when nothing painted. */
  bounds: Box | null
  /** The root node's height as returned — what `compileSlide` stacks with. */
  rootHeight: number
  /** True when the painted content follows the box (a chart, an image, a stretched stack grows
   *  with it; a donut scales down to it): such a block has no natural height of its own;
   *  `natural` is what it paints at `opts.height` (or its preferred height). */
  elastic: boolean
  text: TextLeafMeasure[]
  leaves: PaintedLeaf[]
  confidence: MeasureConfidence
  /** Why confidence is not `high`. */
  reason?: string
}

export interface MeasureBlockOptions {
  /** The height the block will actually get. Used for elastic blocks' `natural`, and for the
   *  `elastic` check's reference. Default: the definition's preferred height. */
  height?: number
  /** The tall probe height used to read natural content height. Default 2160 (2× a frame). */
  probeHeight?: number
}

/** Tall enough that no realistic content autofits/shrinks, and twice a 1080 frame. */
export const DEFAULT_PROBE_HEIGHT = 2160
/** Extra height of the second probe that detects elastic (fill-the-box) blocks. */
const ELASTIC_PROBE_DELTA = 720
/** A rect/path is a backdrop when it matches the layout box to this share per axis. */
const BACKDROP_COVER = 0.98
/** Natural height difference (units) between the two probes that marks a block elastic. */
const ELASTIC_TOLERANCE = 2

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Leaf collection                                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface CollectedLeaves {
  leaves: PaintedLeaf[]
  text: TextLeafMeasure[]
  /** Rect/path leaves dropped as full-box backdrops. */
  backdrops: PaintedLeaf[]
  /** A `host` node without a poster was found (its geometry is unknown). */
  opaqueHost: boolean
  /** A `host` node with a poster was found (geometry comes from the export poster). */
  posterHost: boolean
}

function offset(b: Box, dx: number, dy: number): Box {
  return { x: b.x + dx, y: b.y + dy, width: b.width, height: b.height }
}

function intersect(a: Box, b: Box): Box | null {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  if (x2 < x1 || y2 < y1) return null
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

/** Union bbox of boxes; `null` for none. */
export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (const b of boxes) {
    x1 = Math.min(x1, b.x)
    y1 = Math.min(y1, b.y)
    x2 = Math.max(x2, b.x + b.width)
    y2 = Math.max(y2, b.y + b.height)
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

/** The painted extent of a text node (block-local), or `null` when it paints nothing. */
function textPainted(node: Extract<LayoutNode, { k: 'text' }>, ox: number, oy: number): TextLeafMeasure | null {
  const lines = node.lines.filter((l) => l.text.trim().length > 0)
  if (lines.length === 0) return null
  const fontSize = node.style.size
  const lineHeight = fontSize * node.style.lineHeight
  const topOf = (l: (typeof lines)[number]) => l.top ?? l.baseline - lineHeight * 0.8
  const first = topOf(node.lines[0])
  const lastLine = node.lines[node.lines.length - 1]
  const bottom = topOf(lastLine) + lineHeight
  const maxLineWidth = node.lines.reduce((m, l) => Math.max(m, l.width), 0)
  const chars = node.lines.reduce((n, l) => n + l.text.trim().length, 0)
  const widthSum = node.lines.reduce((n, l) => n + l.width, 0)
  const charsPerLine = widthSum > 0 ? Math.max(1, Math.floor((node.box.width * chars) / widthSum)) : 0
  const box: Box = { x: ox + node.box.x, y: oy + node.box.y, width: node.box.width, height: node.box.height }
  return {
    part: node.part,
    propPath: node.propPath,
    lines: node.lines.length,
    lineHeight,
    fontSize,
    scale: node.style.scale ?? 1,
    maxLineWidth,
    chars,
    charsPerLine,
    box,
    painted: { x: box.x, y: box.y + first, width: maxLineWidth, height: bottom - first },
  }
}

const PATH_TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g
const PATH_ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }

/** Points along an SVG elliptical arc (endpoint parameterisation, SVG spec F.6.5). */
function arcPoints(
  x1: number, y1: number, rx: number, ry: number, phiDeg: number, large: number, sweep: number, x2: number, y2: number
): Array<[number, number]> {
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  if (rx === 0 || ry === 0) return [[x2, y2]]
  const phi = (phiDeg * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const xp = cos * dx + sin * dy
  const yp = -sin * dx + cos * dy
  const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry)
  if (lambda > 1) {
    rx *= Math.sqrt(lambda)
    ry *= Math.sqrt(lambda)
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp
  const den = rx * rx * yp * yp + ry * ry * xp * xp
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / (den || 1)))
  const cxp = (coef * rx * yp) / ry
  const cyp = (-coef * ry * xp) / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry)
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry)
  if (!sweep && dt > 0) dt -= 2 * Math.PI
  if (sweep && dt < 0) dt += 2 * Math.PI
  const pts: Array<[number, number]> = []
  const steps = 24
  for (let i = 1; i <= steps; i++) {
    const t = t1 + (dt * i) / steps
    const ex = rx * Math.cos(t)
    const ey = ry * Math.sin(t)
    pts.push([cos * ex - sin * ey + cx, sin * ex + cos * ey + cy])
  }
  return pts
}

/**
 * Bounding box of an SVG path's geometry, in the path's own coordinates (the node box's local
 * space: the DOM renderer draws `d` in a `viewBox="0 0 w h"` svg). Control points are included
 * (a slight over-estimate for curves); arcs are sampled. `null` when `d` has no points.
 */
export function pathBounds(d: string): Box | null {
  const tokens = d.match(PATH_TOKEN) ?? []
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  const add = (px: number, py: number) => {
    if (!Number.isFinite(px) || !Number.isFinite(py)) return
    x1 = Math.min(x1, px)
    y1 = Math.min(y1, py)
    x2 = Math.max(x2, px)
    y2 = Math.max(y2, py)
  }
  let i = 0
  let cmd = ''
  while (i < tokens.length) {
    const tok = tokens[i]
    if (/[a-zA-Z]/.test(tok)) {
      cmd = tok
      i++
      if (cmd === 'Z' || cmd === 'z') {
        x = sx
        y = sy
        continue
      }
    } else if (!cmd) {
      i++
      continue
    }
    const upper = cmd.toUpperCase()
    const arity = PATH_ARITY[upper] ?? 0
    if (arity === 0) continue
    const nums = tokens.slice(i, i + arity).map(Number)
    if (nums.length < arity || nums.some((n) => Number.isNaN(n))) break
    i += arity
    const rel = cmd !== upper
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    switch (upper) {
      case 'H':
        x = ox + nums[0]
        add(x, y)
        break
      case 'V':
        y = oy + nums[0]
        add(x, y)
        break
      case 'A': {
        const ex = ox + nums[5]
        const ey = oy + nums[6]
        add(x, y)
        for (const [px, py] of arcPoints(x, y, nums[0], nums[1], nums[2], nums[3], nums[4], ex, ey)) add(px, py)
        x = ex
        y = ey
        break
      }
      default: {
        for (let k = 0; k < arity; k += 2) add(ox + nums[k], oy + nums[k + 1])
        x = ox + nums[arity - 2]
        y = oy + nums[arity - 1]
        if (upper === 'M') {
          sx = x
          sy = y
          // Implicit repeated pairs after M are L.
          cmd = rel ? 'l' : 'L'
        }
      }
    }
  }
  if (x1 === Infinity) return null
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

/**
 * Walk a laid-out tree and collect its painted leaves in block-local coordinates. `layoutBox`
 * is the box the block was laid out in; a rect/path matching it (98-102% per axis) is a backdrop.
 */
export function collectPaintedLeaves(root: LayoutNode, layoutBox: Size): CollectedLeaves {
  const out: CollectedLeaves = { leaves: [], text: [], backdrops: [], opaqueHost: false, posterHost: false }
  // ≈ the layout box itself: covers it (≥ 98%) without reaching past it (a rect taller than the
  // box is content that overflows, not a backdrop).
  const fitsAxis = (v: number, ref: number) => v >= ref * BACKDROP_COVER && v <= ref / BACKDROP_COVER + 1
  const isBackdrop = (b: Box) => fitsAxis(b.width, layoutBox.width) && fitsAxis(b.height, layoutBox.height)

  function push(leaf: PaintedLeaf, clip: Box | null): void {
    const box = clip ? intersect(leaf.box, clip) : leaf.box
    if (!box) return
    out.leaves.push({ ...leaf, box })
  }

  function walk(n: LayoutNode, ox: number, oy: number, clip: Box | null): void {
    const abs: Box = { x: ox + n.box.x, y: oy + n.box.y, width: n.box.width, height: n.box.height }
    switch (n.k) {
      case 'group': {
        if (n.opacity === 0) return
        const nextClip = n.clip ? (clip ? intersect(clip, abs) : abs) : clip
        if (n.clip && !nextClip) return
        for (const c of n.children) walk(c, abs.x, abs.y, nextClip)
        return
      }
      case 'host': {
        if (n.poster) {
          out.posterHost = true
          walk(n.poster, abs.x, abs.y, clip)
        } else {
          out.opaqueHost = true
          push({ k: 'host', part: n.part, box: abs }, clip)
        }
        return
      }
      case 'text': {
        const t = textPainted(n, ox, oy)
        if (!t) return
        out.text.push(t)
        push({ k: 'text', part: n.part, box: t.painted }, clip)
        return
      }
      case 'rect':
      case 'path': {
        if (abs.width <= 0 && abs.height <= 0) return
        if (!n.fill && !n.stroke) return
        let geo: Box | null = abs
        if (n.k === 'path') {
          // `d` is drawn in the node box's local space and clipped to it (svg viewBox).
          const local = pathBounds(n.d)
          geo = local ? intersect(offset(local, abs.x, abs.y), abs) : null
          if (!geo) return
        }
        if (isBackdrop(geo)) {
          out.backdrops.push({ k: n.k, part: n.part, box: geo })
          return
        }
        push({ k: n.k, part: n.part, box: geo }, clip)
        return
      }
      case 'line': {
        // A horizontal/vertical rule has a zero-height/-width box; keep it.
        if (abs.width <= 0 && abs.height <= 0) return
        push({ k: 'line', part: n.part, box: abs }, clip)
        return
      }
      case 'image':
      case 'icon': {
        if (abs.width <= 0 || abs.height <= 0) return
        push({ k: n.k, part: n.part, box: abs }, clip)
        return
      }
    }
  }

  walk(root, 0, 0, null)
  return out
}

/** Union of the painted leaves; a block that paints only a backdrop (a decoration) is its backdrop. */
export function paintedBounds(c: CollectedLeaves): Box | null {
  return unionBox(c.leaves.map((l) => l.box)) ?? unionBox(c.backdrops.map((l) => l.box))
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* measureBlock                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

function ctxAt(ctx: LayoutContext, size: Size): LayoutContext {
  if (ctx.withBox) return ctx.withBox(size)
  // Hand-built context without `withBox`: rebuild with the same providers.
  return createLayoutContext({
    box: size,
    tokens: ctx.tokens,
    surface: ctx.surface,
    measureText: ctx.measureText,
    resolveText: ctx.resolveText,
    asset: ctx.asset,
    resolveAsset: ctx.resolveAsset,
    icon: ctx.icon,
    depth: ctx.depth,
    headless: ctx.headless,
    style: ctx.style,
  })
}

interface Probe {
  root: LayoutNode
  collected: CollectedLeaves
  bounds: Box | null
}

function probe(def: BlockDefinition, props: Record<string, unknown>, ctx: LayoutContext, size: Size): Probe {
  const root = layoutBlock(def, props, ctxAt(ctx, size))
  const collected = collectPaintedLeaves(root, size)
  return { root, collected, bounds: paintedBounds(collected) }
}

/**
 * Measure a block's natural size at `width`. `ctx` supplies tokens, the text-metrics provider
 * (pass `tableMetrics()` for ~3% accuracy; the default `estimateMetrics` is ±20-35%), the
 * registry (for containers) and the instance `style` (padding/align are honoured through
 * `layoutBlock`, exactly as `compileSlide` does). Never throws.
 */
export function measureBlock(
  def: BlockDefinition,
  props: Record<string, unknown>,
  width: number,
  ctx: LayoutContext,
  opts: MeasureBlockOptions = {}
): BlockMeasure {
  const kind: BlockKind = def.kind ?? 'layout'
  const probeHeight = opts.probeHeight ?? DEFAULT_PROBE_HEIGHT
  const fillHeight = opts.height ?? def.size.preferred[1]
  const base = { type: def.type, kind, width }

  let tall: Probe
  let taller: Probe
  try {
    tall = probe(def, props, ctx, { width, height: probeHeight })
    taller = probe(def, props, ctx, { width, height: probeHeight + ELASTIC_PROBE_DELTA })
  } catch (err) {
    return {
      ...base,
      probeHeight,
      natural: { width, height: 0 },
      bounds: null,
      rootHeight: 0,
      elastic: false,
      text: [],
      leaves: [],
      confidence: 'low',
      reason: `layout threw: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  const h1 = tall.bounds?.height ?? 0
  const h2 = taller.bounds?.height ?? 0
  // Grows with a taller box (a chart that fills it) …
  let elastic = h2 - h1 > ELASTIC_TOLERANCE
  // … or scales down to fit a shorter one (a donut whose diameter is the smaller box side). A
  // text block that autofits (shrinks its type) is not elastic: its natural size is full-size.
  let fill: Probe | undefined
  if (!elastic && fillHeight < probeHeight) {
    try {
      fill = probe(def, props, ctx, { width, height: fillHeight })
      // Backdrops count here: at a box that equals its natural height, a content-sized card's
      // surface rect matches the box and would otherwise be dropped as a backdrop.
      const all = unionBox([...fill.collected.leaves, ...fill.collected.backdrops].map((l) => l.box))
      const hf = all ? all.y + all.height : 0
      const shrankText = fill.collected.text.some((t) => t.scale < 0.999)
      elastic = !shrankText && (all?.height ?? 0) < h1 - ELASTIC_TOLERANCE && hf <= fillHeight + ELASTIC_TOLERANCE
    } catch {
      fill = undefined
    }
  }

  let ref = tall
  let refHeight = probeHeight
  if (elastic) {
    try {
      ref = fill ?? probe(def, props, ctx, { width, height: fillHeight })
      refHeight = fillHeight
    } catch {
      // keep the tall probe
    }
  }

  let confidence: MeasureConfidence = 'high'
  let reason: string | undefined
  if (ref.collected.opaqueHost) {
    confidence = 'low'
    reason = 'html host without a poster: geometry unknown'
  } else if (kind === 'html' || ref.collected.posterHost) {
    confidence = 'medium'
    reason = 'html block: geometry from its export poster, the live DOM may differ'
  } else if (ctx.measureText === estimateMetrics) {
    confidence = 'medium'
    reason = 'estimateMetrics text widths (±20-35%)'
  }

  return {
    ...base,
    probeHeight: refHeight,
    natural: ref.bounds ? { width: ref.bounds.width, height: ref.bounds.height } : { width, height: 0 },
    bounds: ref.bounds,
    rootHeight: ref.root.box.height,
    elastic,
    text: ref.collected.text,
    leaves: ref.collected.leaves,
    confidence,
    ...(reason ? { reason } : {}),
  }
}
