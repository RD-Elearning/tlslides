/**
 * P3 diagram kit: small pure helpers shared by the `tls.g.*` process and timeline blocks, on top of
 * the P2 chart kit (`library/data/_chart/kit.ts`) and the P0.8 diagram helpers.
 *
 * Conventions (same as the chart kit): `path` nodes carry ABSOLUTE coordinates in block space and a
 * box of the whole block at (0, 0); lines are thin `rect`s; text is clipped (ellipsis) rather than
 * allowed to overflow; text widths are only estimates (-20%..+35%) so every "does it fit" decision
 * multiplies by TEXT_SLACK.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box, LayoutContext, LayoutNode, ResolvedTextStyle, TypeToken } from '../../types'
import { mixHex, rgbToHsl, tryHexToRgb } from '../../color-math'
import { clipLines, ellipsize, fullBox, lineH, pathNode, solidRect, withRealWidths } from '../data/_chart/kit'

export { TEXT_SLACK, asArr, clamp, enumOf, numOrNull, root, str, style, mutedStyle, lineH, chartColors, tintOf, onColor, readableOn, solidRect, pathNode, emptyState, capacityOf, dot } from '../data/_chart/kit'

/** Plain-object entries of an unknown list value (anything else is dropped). */
export function objs(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) as Array<Record<string, unknown>>) : []
}

/** A part-name-safe version of a free id. */
export function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || '_'
}

export interface PlacedLines {
  nodes: LayoutNode[]
  /** Height of the clipped text (lines x line height). */
  height: number
  /** Widest estimated line. */
  width: number
  lineCount: number
}

/**
 * Text clipped to `maxLines` of `box.width` and placed start / center / end aligned. Over-long
 * words are cut with an ellipsis so a narrow box never wraps per letter. Non-start alignment emits
 * one node per line (parts `part`, `part.1`, ...) because text nodes carry no alignment.
 */
export function placeLines(
  ctx: LayoutContext,
  text: string,
  s: ResolvedTextStyle,
  box: { x: number; y: number; width: number },
  align: 'start' | 'center' | 'end',
  maxLines: number,
  part: string
): PlacedLines {
  const w = Math.max(1, box.width)
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean || maxLines < 1) return { nodes: [], height: 0, width: 0, lineCount: 0 }
  // RV07: browser-true Inter widths: a box sized from the flat estimate was a few px narrower than
  // its glyphs ("Check" 63 in a 60 box), so the DOM wrapped it.
  const rc = withRealWidths(ctx)
  const raw = clean.split(' ')
  const words = raw.map((x) => ellipsize(rc, x, s, w))
  const m = rc.measureText(words.join(' '), s, w)
  const lines = clipLines(m.lines, Math.max(1, Math.floor(maxLines)))
  // enhance: a cut word or a dropped line is text the reader never sees
  const cut = m.lines.length > lines.length || words.some((x, i) => x !== raw[i])
  // The ellipsis appended to the last kept line can push it past the box: drop words until it fits.
  if (m.lines.length > lines.length) {
    const last = lines[lines.length - 1]
    let t = last.text
    while (rc.measureText(t, s).width > w && /\s/.test(t.replace(/…$/, '').trim())) {
      t = `${t.replace(/…$/, '').trim().replace(/\s+\S+$/, '').replace(/[\s.,;:]+$/, '')}…`
    }
    if (rc.measureText(t, s).width > w) t = ellipsize(rc, t.replace(/…$/, ''), s, w)
    lines[lines.length - 1] = { ...last, text: t, width: Math.min(w, rc.measureText(t, s).width) }
  }
  const lh = lineH(s)
  const height = lines.length * lh
  const width = Math.min(w, Math.max(0, ...lines.map((l) => l.width)))
  if (align === 'start') {
    return {
      nodes: [{ k: 'text', part, box: { x: box.x, y: box.y, width: w, height }, lines, style: s, ...(cut ? { truncated: true as const } : {}) }],
      height,
      width,
      lineCount: lines.length,
    }
  }
  const nodes: LayoutNode[] = lines.map((l, i) => {
    const lw = Math.min(w, l.width)
    const x = align === 'center' ? box.x + (w - lw) / 2 : box.x + (w - lw)
    return {
      k: 'text',
      part: i === 0 ? part : `${part}.${i}`,
      box: { x, y: box.y + i * lh, width: Math.max(1, lw + 1), height: lh },
      lines: [{ ...l, top: 0, baseline: l.baseline - (l.top ?? i * lh) }],
      style: s,
      ...(cut ? { truncated: true as const } : {}),
    } as LayoutNode
  })
  return { nodes, height, width, lineCount: lines.length }
}

/** Height `placeLines` would use, without building nodes. */
export function linesHeight(ctx: LayoutContext, text: string, s: ResolvedTextStyle, width: number, maxLines: number): number {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean || maxLines < 1) return 0
  const w = Math.max(1, width)
  const rc = withRealWidths(ctx)
  const m = rc.measureText(clean.split(' ').map((x) => ellipsize(rc, x, s, w)).join(' '), s, w)
  return Math.min(m.lines.length, Math.floor(maxLines)) * lineH(s)
}

/**
 * Lines `text` takes at `width` with nothing clipped, as `placeLines` would wrap it; `Infinity` when
 * one word is wider than the box (it would be cut with an ellipsis). The type tiers of a block
 * (`fitTier`) ask this to know whether a tier shows every word.
 */
export function linesNeeded(ctx: LayoutContext, text: string, s: ResolvedTextStyle, width: number): number {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return 0
  const w = Math.max(1, width)
  const rc = withRealWidths(ctx)
  const words = clean.split(' ')
  if (words.some((x) => ellipsize(rc, x, s, w) !== x)) return Infinity
  return rc.measureText(clean, s, w).lines.length
}

/**
 * The first tier (largest type first) whose layout `fits`; the last tier when none does (it clips,
 * as the block always did). Blocks whose box grows with the slide pick their type this way, so a
 * timeline alone on a slide reads at slide size instead of keeping caption type in a large box.
 */
export function fitTier<T>(tiers: readonly T[], fits: (tier: T) => boolean, ctx?: LayoutContext): T {
  for (let i = tierStart(ctx, tiers.length); i < tiers.length; i++) if (fits(tiers[i])) return tiers[i]
  return tiers[tiers.length - 1]
}

/**
 * The first tier a block may take: `style.typeStep` (carried on the tokens) skips the largest ones,
 * so `compileSlide` can bring a slide back to five text sizes (`harmonizeTypes`).
 */
export function tierStart(ctx: LayoutContext | undefined, count: number): number {
  return Math.max(0, Math.min(count - 1, ctx?.tokens.typeStep ?? 0))
}

/** The type ladder `promoteToFit` steps along (diagram text never passes `heading`). */
const LADDER: readonly TypeToken[] = ['footnote', 'caption', 'body', 'lead', 'subheading', 'heading']

/** `ctx` with every type token `n` steps up the ladder (sizes stay on the scale: no new odd sizes). */
export function promoteType(ctx: LayoutContext, n: number): LayoutContext {
  if (n <= 0) return ctx
  const up = (t: TypeToken): TypeToken => {
    const i = LADDER.indexOf(t)
    return i < 0 ? t : LADDER[Math.min(LADDER.length - 1, i + n)]
  }
  return { ...ctx, resolveText: (t, over) => ctx.resolveText(up(t), over) }
}

type TextSummary = { chars: number; lines: number; cut: boolean; boxes: Box[]; outside: boolean }
function summarize(root: LayoutNode, W: number, H: number, ctx?: LayoutContext): TextSummary {
  const out: TextSummary = { chars: 0, lines: 0, cut: false, boxes: [], outside: false }
  const walk = (n: LayoutNode, ox: number, oy: number) => {
    const x = ox + n.box.x
    const y = oy + n.box.y
    if (n.k === 'group') {
      for (const c of n.children) walk(c, x, y)
      return
    }
    if (n.box.width > 0 && n.box.height > 0 && (x < -1 || y < -1 || x + n.box.width > W + 1 || y + n.box.height > H + 1)) out.outside = true
    if (n.k !== 'text') return
    if ((n as { truncated?: boolean }).truncated) out.cut = true
    for (const l of n.lines) {
      out.chars += l.text.replace(/[\s…]/g, '').length
      out.lines++
      // the host's own measure (the layout report's, the browser's canvas) may set a line a few
      // percent wider than the face table the block wrapped with: it must still end in the box
      if (ctx && x + Math.max(l.width, ctx.measureText(l.text.trimEnd(), n.style).width) > W + 1) out.outside = true
    }
    out.boxes.push({ x, y, width: n.box.width, height: n.box.height })
  }
  walk(root, -root.box.x, -root.box.y)
  return out
}

/**
 * 2026-10-24 corpus: diagram blocks that set fixed caption / footnote type (a 2×2, a cycle, a
 * flow, a Venn…) drew it the same in a quarter slide and in a whole one. A block wrapped in this
 * is laid out with its type `n` ladder steps up (largest first, at most `maxStep`, less any
 * `style.typeStep`) and keeps the first that shows the same text as the authored size (nothing cut
 * or dropped), stays in its box, keeps text off text, and does not more than double its lines.
 */
export function promoteToFit(ctx: LayoutContext, lay: (c: LayoutContext) => LayoutNode, maxStep = 3): LayoutNode {
  const base = lay(ctx)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const b = summarize(base, W, H, ctx)
  if (!b.chars) return base
  for (let n = maxStep - (ctx.tokens.typeStep ?? 0); n >= 1; n--) {
    const node = lay(promoteType(ctx, n))
    const s = summarize(node, W, H, ctx)
    if (s.cut || (s.outside && !b.outside) || s.chars < b.chars || s.lines > 2 * b.lines + 1) continue
    const overlap = s.boxes.some((a, i) => s.boxes.some((c, j) => j > i && a.x < c.x + c.width - 1 && c.x < a.x + a.width - 1 && a.y < c.y + c.height - 1 && c.y < a.y + a.height - 1))
    if (overlap) continue
    return node
  }
  return base
}

/**
 * Whether a block's tree shows its text whole inside its box: nothing cut, every leaf and every line
 * (by the host's measure too) in the box, no text on text. A tiered block can test a tier's real
 * layout with it instead of predicting the layout's geometry.
 */
export function showsWhole(ctx: LayoutContext, node: LayoutNode): boolean {
  const s = summarize(node, Math.max(1, ctx.box.width), Math.max(1, ctx.box.height), ctx)
  if (s.cut || s.outside) return false
  return !s.boxes.some((a, i) => s.boxes.some((c, j) => j > i && a.x < c.x + c.width - 1 && c.x < a.x + a.width - 1 && a.y < c.y + c.height - 1 && c.y < a.y + a.height - 1))
}

/** Stroke-only path (arcs, polylines) in absolute block coordinates. */
export function strokePath(ctx: LayoutContext, d: string, part: string, color: string, width = 2): LayoutNode {
  return pathNode(ctx, d, part, { stroke: color, strokeWidth: width })
}

/** A filled triangular arrowhead with its tip at `tip`, pointing along unit vector (ux, uy). */
export function arrowHead(ctx: LayoutContext, tip: { x: number; y: number }, ux: number, uy: number, size: number, color: string, part: string): LayoutNode {
  const f = (v: number) => String(Math.round(v * 100) / 100)
  const bx = tip.x - ux * size
  const by = tip.y - uy * size
  const h = size * 0.55
  const d = `M${f(tip.x)} ${f(tip.y)}L${f(bx - uy * h)} ${f(by + ux * h)}L${f(bx + uy * h)} ${f(by - ux * h)}Z`
  return pathNode(ctx, d, part, { fill: color })
}

/** A polyline path string from points. */
export function polyline(points: Array<{ x: number; y: number }>): string {
  const f = (v: number) => String(Math.round(v * 100) / 100)
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${f(p.x)} ${f(p.y)}`).join('')
}

/** Thin horizontal or vertical bar as a rect (the `line` node is unreliable in the DOM). */
export function bar(box: Box, color: string, part: string): LayoutNode {
  return solidRect(box, color, part)
}

/** Colour i of n on the accent -> accent2 ramp (or the categorical ramp / one accent). */
export function rampColor(ctx: LayoutContext, mode: 'gradient' | 'single' | 'series', i: number, n: number): string {
  const a = ctx.resolveColor('accent').color
  if (mode === 'single') return a
  if (mode === 'series') return ctx.tokens.categorical[i % Math.max(1, ctx.tokens.categorical.length)] ?? a
  const b = ctx.resolveColor('accent2').color
  const t = n <= 1 ? 0 : i / (n - 1)
  // Complementary pairs (coral/teal) mix to a muddy grey in the middle. When the hues are far
  // apart, ramp from the accent to a light tint of it instead.
  const ra = tryHexToRgb(a)
  const rb = tryHexToRgb(b)
  if (ra && rb) {
    const dh = Math.abs(rgbToHsl(ra).h - rgbToHsl(rb).h) // hue is 0..1
    if (Math.min(dh, 1 - dh) > 0.25) return mixHex(a, mixHex(a, ctx.resolveColor('surface').color, 0.62), t)
  }
  return mixHex(a, b, t)
}

export { fullBox }

/** Bounding box of every number pair in an absolute path `d` (used by the collision tests). */
export function pathBounds(d: string): Box {
  const nums = [...d.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
  if (nums.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  const xs = nums.map((p) => p.x)
  const ys = nums.map((p) => p.y)
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}
