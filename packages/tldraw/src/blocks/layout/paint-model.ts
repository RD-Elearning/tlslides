/**
 * CMP2 — the paint model: what is painted under a point of a laid-out tree.
 *
 * A `LayoutNode` tree paints in depth-first order (later siblings on top). `collectPaint` walks a
 * tree once and records, in that order:
 * - **paint ops** — every filled `rect` / `path` (its paint, alpha × group opacity, box clipped to
 *   the group clips, and for a path its flattened polygons), every `image`, every opaque `host`
 *   (no poster: the browser paints something unknown there);
 * - **inks** — every `text` and `icon` leaf with its colour(s), alpha, effective size, weight, the
 *   points it is sampled at (three per line: 15 %, 50 %, 85 % along it, at mid-line height; five
 *   for an icon) and how many ops were painted before it.
 *
 * `backgroundsAt(pt, ops, upto, base)` composites the ops under a point (top-most first; a
 * translucent fill is blended over what is beneath it in plain sRGB, as the renderers do), down to
 * `base` (the slide background or the surface a block sits on). An image or an opaque host is a
 * luminance nobody can know: it answers both extremes (black and white), so text on a photo
 * passes only behind a scrim dark (or light) enough for either. `inkContrast` is the worst WCAG
 * ratio of an ink over every point and every possible background.
 *
 * Used by the ink guard (`ink-guard.ts`, the engine: role-derived ink that would fail contrast on
 * what is actually painted under it is solved) and the layout report's `contrast/low` (the
 * oracle: everything that still fails). Pure and DOM-free.
 */

import type { Box, LayoutNode, Paint, Pt } from '../types'
import { contrastRatio, parseColorAlpha, relativeLuminance, type RGB } from '../color-math'
import { gradientAngleToVector } from '~state/shapes/shared'

/** One painted surface. */
export interface PaintOp {
  kind: 'fill' | 'unknown'
  /** Absolute box (clipped). */
  box: Box
  paint?: Paint
  /** The node's own (unclipped) box: the paint's coordinate frame (gradients). */
  frame?: Box
  /** Group opacity product (the paint's own alpha is applied per colour). */
  alpha: number
  /** Flattened polygons of a filled path (absolute); a point paints when inside (even-odd). */
  poly?: Array<Array<[number, number]>>
  /** The rect's corner radius, for the corner test. */
  radius?: number
  /** Index into the walk's owner list (see `collectPaint`'s `owner`). */
  owner?: number
}

export interface InkLeaf {
  kind: 'text' | 'icon'
  node: Extract<LayoutNode, { k: 'text' }> | Extract<LayoutNode, { k: 'icon' }>
  /** Absolute box of the node. */
  box: Box
  /** Every distinct colour the leaf paints (style colour and run colours). */
  colors: string[]
  /** Group opacity product. */
  alpha: number
  /** Effective font size (size × autofit scale); 0 for an icon. */
  fontSize: number
  bold: boolean
  points: Pt[]
  /** Ops painted before this leaf (the ones that can be under it). */
  below: number
  /** Index into the walk's owner list. */
  owner?: number
  /** Inside an html host's poster (the template paints it, not the tree). */
  inHost: boolean
  /** Index of this text leaf among the tree's non-blank text nodes (the order
   *  `collectPaintedLeaves` lists them in); -1 for an icon. */
  textIndex: number
}

export interface CollectedPaint {
  ops: PaintOp[]
  inks: InkLeaf[]
}

export interface CollectPaintOptions {
  /** Absolute origin of the tree's root. */
  origin?: Pt
  /** Called for every group before its children; returns the owner index for the subtree
   *  (`undefined` = keep the parent's). Lets a caller attribute leaves to nested blocks. */
  owner?: (group: Extract<LayoutNode, { k: 'group' }>, abs: Box, parent: number | undefined) => number | undefined
  /** Owner of the root. */
  rootOwner?: number
}

const isBlank = (n: Extract<LayoutNode, { k: 'text' }>) => !n.lines.some((l) => l.text.trim().length > 0)

function intersect(a: Box, b: Box): Box | null {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  if (x2 <= x1 || y2 <= y1) return null
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

/** A fill that paints nothing (`transparent`, alpha 0). */
function invisible(paint: Paint | undefined): boolean {
  if (!paint) return true
  if (paint.type !== 'solid') return paint.stops.length === 0
  const c = parseColorAlpha(paint.color)
  return !!c && c.alpha === 0
}

/**
 * Walk a laid-out tree in paint order (see the module comment). Never throws on a well-formed tree.
 */
export function collectPaint(root: LayoutNode, opts: CollectPaintOptions = {}): CollectedPaint {
  const ops: PaintOp[] = []
  const inks: InkLeaf[] = []
  let textIndex = 0
  const walk = (n: LayoutNode, ox: number, oy: number, clip: Box | null, alpha: number, owner: number | undefined, inHost: boolean): void => {
    const abs: Box = { x: ox + n.box.x, y: oy + n.box.y, width: n.box.width, height: n.box.height }
    switch (n.k) {
      case 'group': {
        if (n.opacity === 0) return
        const a = alpha * (typeof n.opacity === 'number' ? n.opacity : 1)
        const nextClip = n.clip ? (clip ? intersect(clip, abs) : abs) : clip
        if (n.clip && !nextClip) return
        const own = opts.owner ? opts.owner(n, abs, owner) : undefined
        for (const c of n.children) walk(c, abs.x, abs.y, nextClip, a, own ?? owner, inHost)
        return
      }
      case 'host': {
        if (n.poster) walk(n.poster, abs.x, abs.y, clip, alpha, owner, true)
        else {
          const box = clip ? intersect(abs, clip) : abs
          if (box) ops.push({ kind: 'unknown', box, alpha, ...(owner !== undefined ? { owner } : {}) })
        }
        return
      }
      case 'rect':
      case 'path': {
        if (invisible(n.fill)) return
        const box = clip ? intersect(abs, clip) : abs
        if (!box || box.width <= 0 || box.height <= 0) return
        const op: PaintOp = { kind: 'fill', box, frame: abs, paint: n.fill, alpha, ...(owner !== undefined ? { owner } : {}) }
        if (n.k === 'path') {
          const poly = flattenPath(n.d, abs.x, abs.y)
          if (poly.length) op.poly = poly
        } else if (typeof n.radius === 'number' && n.radius > 0) {
          op.radius = n.radius
        }
        ops.push(op)
        return
      }
      case 'image': {
        const box = clip ? intersect(abs, clip) : abs
        if (box && box.width > 0 && box.height > 0) ops.push({ kind: 'unknown', box, alpha, ...(owner !== undefined ? { owner } : {}) })
        return
      }
      case 'text': {
        if (isBlank(n)) return
        const idx = textIndex++
        const colors = new Set<string>()
        let bold = true
        let anyRun = false
        for (const l of n.lines) {
          if (!l.text.trim()) continue
          const runs = l.runs && l.runs.length ? l.runs : undefined
          if (!runs) {
            colors.add(n.style.color)
            bold = false
            continue
          }
          for (const r of runs) {
            if (!r.text.trim()) continue
            anyRun = true
            colors.add(r.color ?? n.style.color)
            if (!r.bold) bold = false
          }
        }
        if (!anyRun && !colors.size) colors.add(n.style.color)
        const lh = n.style.size * n.style.lineHeight
        const points: Pt[] = []
        for (const l of n.lines) {
          if (!l.text.trim()) continue
          const top = l.top ?? l.baseline - lh * 0.8
          const y = abs.y + top + lh / 2
          const w = Math.max(1, Math.min(l.width, abs.width || l.width))
          for (const f of [0.15, 0.5, 0.85]) points.push({ x: abs.x + w * f, y })
        }
        inks.push({
          kind: 'text',
          node: n,
          box: abs,
          colors: [...colors],
          alpha,
          fontSize: n.style.size * (n.style.scale ?? 1),
          bold: bold && (anyRun || n.weight === 700),
          points,
          below: ops.length,
          ...(owner !== undefined ? { owner } : {}),
          inHost,
          textIndex: idx,
        })
        return
      }
      case 'icon': {
        if (abs.width <= 0 || abs.height <= 0) return
        const { x, y, width: w, height: h } = abs
        inks.push({
          kind: 'icon',
          node: n,
          box: abs,
          colors: [n.fill],
          alpha,
          fontSize: 0,
          bold: false,
          points: [
            { x: x + w / 2, y: y + h / 2 },
            { x: x + w * 0.3, y: y + h * 0.3 },
            { x: x + w * 0.7, y: y + h * 0.3 },
            { x: x + w * 0.3, y: y + h * 0.7 },
            { x: x + w * 0.7, y: y + h * 0.7 },
          ],
          below: ops.length,
          ...(owner !== undefined ? { owner } : {}),
          inHost,
          textIndex: -1,
        })
        return
      }
      default:
        return
    }
  }
  const o = opts.origin ?? { x: 0, y: 0 }
  walk(root, o.x, o.y, null, 1, opts.rootOwner, false)
  return { ops, inks }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Path flattening (even-odd point test)                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Points along an SVG elliptical arc (endpoint parametrisation), excluding the start. Shared with
 *  `measure-block.ts`'s path bounds. */
export function arcPoints(
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


const TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g
const ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }
const STEPS = 8

/** SVG path data → closed polygons (curves sampled, arcs approximated by their chord fan). */
export function flattenPath(d: string, ox: number, oy: number): Array<Array<[number, number]>> {
  const toks = d.match(TOKEN) ?? []
  const polys: Array<Array<[number, number]>> = []
  let cur: Array<[number, number]> = []
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let cmd = ''
  let prevC: [number, number] | null = null
  let prevQ: [number, number] | null = null
  let i = 0
  const close = () => {
    if (cur.length > 2) polys.push(cur)
    cur = []
  }
  const add = (px: number, py: number) => cur.push([ox + px, oy + py])
  while (i < toks.length) {
    const t = toks[i]
    if (/[A-Za-z]/.test(t)) {
      cmd = t
      i++
      if (cmd === 'Z' || cmd === 'z') {
        x = sx
        y = sy
        close()
        prevC = prevQ = null
        continue
      }
    }
    if (!cmd) return polys
    const up = cmd.toUpperCase()
    const rel = cmd !== up
    const n = ARITY[up]
    if (n === undefined || n === 0) return polys
    const nums: number[] = []
    for (let k = 0; k < n && i < toks.length; k++) {
      const v = Number(toks[i])
      if (!Number.isFinite(v)) return polys
      nums.push(v)
      i++
    }
    if (nums.length < n) break
    const bx = rel ? x : 0
    const by = rel ? y : 0
    switch (up) {
      case 'M':
        close()
        x = bx + nums[0]
        y = by + nums[1]
        sx = x
        sy = y
        add(x, y)
        cmd = rel ? 'l' : 'L'
        prevC = prevQ = null
        continue
      case 'L':
        x = bx + nums[0]
        y = by + nums[1]
        add(x, y)
        break
      case 'H':
        x = (rel ? x : 0) + nums[0]
        add(x, y)
        break
      case 'V':
        y = (rel ? y : 0) + nums[0]
        add(x, y)
        break
      case 'C':
      case 'S': {
        const c1: [number, number] = up === 'C' ? [bx + nums[0], by + nums[1]] : prevC ? [2 * x - prevC[0], 2 * y - prevC[1]] : [x, y]
        const k = up === 'C' ? 2 : 0
        const c2: [number, number] = [bx + nums[k], by + nums[k + 1]]
        const e: [number, number] = [bx + nums[k + 2], by + nums[k + 3]]
        for (let s = 1; s <= STEPS; s++) {
          const u = s / STEPS
          const v = 1 - u
          add(v * v * v * x + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * e[0], v * v * v * y + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * e[1])
        }
        prevC = c2
        prevQ = null
        x = e[0]
        y = e[1]
        continue
      }
      case 'Q':
      case 'T': {
        const q: [number, number] = up === 'Q' ? [bx + nums[0], by + nums[1]] : prevQ ? [2 * x - prevQ[0], 2 * y - prevQ[1]] : [x, y]
        const e: [number, number] = up === 'Q' ? [bx + nums[2], by + nums[3]] : [bx + nums[0], by + nums[1]]
        for (let s = 1; s <= STEPS; s++) {
          const u = s / STEPS
          const v = 1 - u
          add(v * v * x + 2 * v * u * q[0] + u * u * e[0], v * v * y + 2 * v * u * q[1] + u * u * e[1])
        }
        prevQ = q
        prevC = null
        x = e[0]
        y = e[1]
        continue
      }
      case 'A': {
        const ex = bx + nums[5]
        const ey = by + nums[6]
        for (const [px, py] of arcPoints(x, y, nums[0], nums[1], nums[2], nums[3], nums[4], ex, ey)) add(px, py)
        x = ex
        y = ey
        break
      }
    }
    prevC = prevQ = null
  }
  close()
  return polys
}

function insidePolys(polys: Array<Array<[number, number]>>, px: number, py: number): boolean {
  let inside = false
  for (const poly of polys) {
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [xa, ya] = poly[a]
      const [xb, yb] = poly[b]
      if (ya > py !== yb > py && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) inside = !inside
    }
  }
  return inside
}

function covers(op: PaintOp, p: Pt): boolean {
  const b = op.box
  if (p.x < b.x || p.x > b.x + b.width || p.y < b.y || p.y > b.y + b.height) return false
  if (op.poly) return insidePolys(op.poly, p.x, p.y)
  if (op.radius) {
    // outside a rounded corner
    const r = Math.min(op.radius, b.width / 2, b.height / 2)
    const cx = p.x < b.x + r ? b.x + r : p.x > b.x + b.width - r ? b.x + b.width - r : p.x
    const cy = p.y < b.y + r ? b.y + r : p.y > b.y + b.height - r ? b.y + b.height - r : p.y
    if ((p.x - cx) ** 2 + (p.y - cy) ** 2 > r * r) return false
  }
  return true
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Colour at a point                                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** What a base (the surface under a tree) is at a point: one or more possible colours (a
 *  gradient known only as a whole answers every stop), or `null` = unknowable (a photo). */
export type Background = { rgb: RGB } | { rgbs: RGB[] } | null

export const BLACK: RGB = { r: 0, g: 0, b: 0 }
export const WHITE: RGB = { r: 255, g: 255, b: 255 }

/** One possible colour under a point; `unknown` when it is an extreme standing in for a photo,
 *  `blended` when a translucent fill was composited over something to get it. */
export interface BgSample {
  rgb: RGB
  unknown: boolean
  blended?: boolean
}

/** A colour string → rgb + alpha (`#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`). */
export function parseInk(color: string | undefined): { rgb: RGB; alpha: number } | undefined {
  if (typeof color !== 'string') return undefined
  const c = parseColorAlpha(color)
  if (!c) return undefined
  const h = c.hex.replace('#', '')
  return { rgb: { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }, alpha: c.alpha }
}

function blend(top: RGB, a: number, under: RGB): RGB {
  return { r: top.r * a + under.r * (1 - a), g: top.g * a + under.g * (1 - a), b: top.b * a + under.b * (1 - a) }
}

/** The colour (and alpha) a paint has at point `p`, inside its own box `frame`. */
export function paintAt(paint: Paint, frame: Box, p: Pt): { rgb: RGB; alpha: number } | undefined {
  if (paint.type === 'solid') return parseInk(paint.color)
  const stops = [...paint.stops].sort((a, b) => a.at - b.at)
  if (!stops.length) return undefined
  const px = frame.width ? (p.x - frame.x) / frame.width : 0.5
  const py = frame.height ? (p.y - frame.y) / frame.height : 0.5
  let t: number
  if (paint.type === 'radialGradient') {
    t = Math.min(1, Math.sqrt((px - paint.cx) ** 2 + (py - paint.cy) ** 2) / 0.75)
  } else {
    const { x1, y1, x2, y2 } = gradientAngleToVector(paint.angle)
    const dx = x2 - x1
    const dy = y2 - y1
    const len = dx * dx + dy * dy
    t = len ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len)) : 0
  }
  const at = (s: { color: string }) => parseInk(s.color)
  if (t <= stops[0].at) return at(stops[0])
  if (t >= stops[stops.length - 1].at) return at(stops[stops.length - 1])
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (t < a.at || t > b.at) continue
    const ca = at(a)
    const cb = at(b)
    if (!ca || !cb) return ca ?? cb
    const u = b.at === a.at ? 0 : (t - a.at) / (b.at - a.at)
    return {
      rgb: { r: ca.rgb.r + (cb.rgb.r - ca.rgb.r) * u, g: ca.rgb.g + (cb.rgb.g - ca.rgb.g) * u, b: ca.rgb.b + (cb.rgb.b - ca.rgb.b) * u },
      alpha: ca.alpha + (cb.alpha - ca.alpha) * u,
    }
  }
  return at(stops[stops.length - 1])
}

const EXTREMES: BgSample[] = [
  { rgb: BLACK, unknown: true },
  { rgb: WHITE, unknown: true },
]

/** What is painted under `p`, below op index `upto` (exclusive), over `base`: every possible
 *  colour (an image or an opaque host answers black and white, flagged `unknown`). */
export function backgroundsAt(p: Pt, ops: readonly PaintOp[], upto: number, base: (p: Pt) => Background): BgSample[] {
  for (let j = Math.min(upto, ops.length) - 1; j >= 0; j--) {
    const op = ops[j]
    if (op.alpha <= 0.001 || !covers(op, p)) continue
    if (op.kind === 'unknown') {
      if (op.alpha >= 0.999) return EXTREMES
      return backgroundsAt(p, ops, j, base).flatMap((u) => [
        { rgb: blend(BLACK, op.alpha, u.rgb), unknown: true, blended: true },
        { rgb: blend(WHITE, op.alpha, u.rgb), unknown: true, blended: true },
      ])
    }
    const frame = op.frame ?? op.box
    const c = op.paint ? paintAt(op.paint, frame, p) : undefined
    if (!c) continue
    const a = c.alpha * op.alpha
    if (a <= 0.001) continue
    if (a >= 0.999) return [{ rgb: c.rgb, unknown: false }]
    return backgroundsAt(p, ops, j, base).map((u) => ({ rgb: blend(c.rgb, a, u.rgb), unknown: u.unknown, blended: true }))
  }
  const b = base(p)
  if (!b) return EXTREMES
  return 'rgbs' in b ? b.rgbs.map((rgb) => ({ rgb, unknown: false })) : [{ rgb: b.rgb, unknown: false }]
}

/** WCAG contrast of an ink colour (alpha-blended over the background) on a background. */
export function contrastOn(ink: { rgb: RGB; alpha: number }, bg: RGB): number {
  const fg = ink.alpha >= 0.999 ? ink.rgb : blend(ink.rgb, ink.alpha, bg)
  return contrastRatio(relativeLuminance(fg), relativeLuminance(bg))
}

/** A neutral grey of the given relative luminance (for a base known only by its luminance). */
export function greyOfLuminance(l: number): RGB {
  const lin = Math.max(0, Math.min(1, l))
  const s = lin <= 0.0031308 ? lin * 12.92 : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055
  const v = Math.round(s * 255)
  return { r: v, g: v, b: v }
}

export interface InkContrast {
  /** Worst ratio over every sample point, colour and possible background. */
  ratio: number
  /** The ink colour of the worst case. */
  color: string
  /** The background of the worst case. */
  bg: RGB
  /** The worst case is over an image / an opaque host (luminance unknowable): needs a scrim. */
  overUnknown: boolean
  /** Some background under the ink came from blending a translucent fill (glass) over something
   *  this tree may not see (another block, a gradient sampled at one point): less certain. */
  blended: boolean
}

/** The worst contrast of one ink leaf. `undefined` when no colour parses. */
export function inkContrast(ink: InkLeaf, ops: readonly PaintOp[], base: (p: Pt) => Background, upto = ink.below): InkContrast | undefined {
  let worst: InkContrast | undefined
  let blended = false
  for (const color of ink.colors) {
    const c = parseInk(color)
    if (!c) continue
    const fg = { rgb: c.rgb, alpha: c.alpha * ink.alpha }
    for (const p of ink.points) {
      for (const bg of backgroundsAt(p, ops, upto, base)) {
        if (bg.blended) blended = true
        const ratio = contrastOn(fg, bg.rgb)
        if (!worst || ratio < worst.ratio) worst = { ratio, color, bg: bg.rgb, overUnknown: bg.unknown, blended: false }
      }
    }
  }
  if (worst) worst.blended = blended
  return worst
}

/** WCAG floors (composition README CMP2): 4.5:1 for text, 3:1 for large text — 24 px or more at
 *  1280 (36 slide units at 1920), or bold from 18.66 px (28 units) — and for icons (non-text
 *  graphics, WCAG 1.4.11). */
export const CONTRAST_FLOOR = { text: 4.5, large: 3, icon: 3 } as const
export const LARGE_TEXT_UNITS = 36
export const LARGE_BOLD_TEXT_UNITS = 28

export function floorOf(ink: Pick<InkLeaf, 'kind' | 'fontSize' | 'bold'>): number {
  if (ink.kind === 'icon') return CONTRAST_FLOOR.icon
  return ink.fontSize >= LARGE_TEXT_UNITS || (ink.bold && ink.fontSize >= LARGE_BOLD_TEXT_UNITS) ? CONTRAST_FLOOR.large : CONTRAST_FLOOR.text
}

/** `rgb` → `#RRGGBB`. */
export function hexOf(rgb: RGB): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toUpperCase()
}
