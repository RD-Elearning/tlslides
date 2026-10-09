/**
 * P2 chart kit: the small, pure helpers every `tls.d.*` chart and metric shares on top of
 * `library/data/_engine` (P0.6). Nothing here knows about a particular block.
 *
 * Rules baked in (P0.6 "chart design rules"): colours always come from roles or the categorical
 * ramp, never hex; at most MAX_HUES series; category labels wrap or thin out, never overlap;
 * no data (empty, all zero, no finite value) draws a muted "No data" text, never NaN geometry.
 *
 * Geometry convention (shared with `tls.d.bar`/`donut`): `path` nodes carry ABSOLUTE coordinates in
 * the block's own space and a box of the whole block at (0, 0), because the DOM renderer clips a
 * path to its box while the SVG renderer ignores the box. Lines are thin `rect`s (the `line`
 * node is unreliable in the DOM renderer).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box, CapacityReport, LayoutContext, LayoutNode, ResolvedTextStyle, Size, TypeToken } from '../../../types'
import { placeText } from '../../text/_engine/text-place'
import { onColor, readableOn, tintOf } from '../../text/_engine/color'
import { formatValue } from '../_engine/format-value'
import { MAX_HUES } from '../_engine/series-color'
import { realWidth, wrapReal } from './inter-width'

export { realWidth, wrapReal }

export { onColor, readableOn, tintOf }

/* ───────────────────────────── scalars & input coercion ───────────────────────────── */

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function asArr<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

export function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Number or null (strings that parse are accepted; everything else is a gap). */
export function numOrNull(v: unknown): number | null {
  if (isNum(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return null
}

export interface Series {
  name: string
  values: Array<number | null>
}

/**
 * Read the multi-series convention `series: list<object{ name, values }>`. A bare number array
 * (the `tls.d.bar` shape) is accepted as one unnamed series. At most MAX_HUES series; every
 * series is padded or cut to `len` values (missing values are gaps, never zeros).
 */
export function readSeries(raw: unknown, len: number): Series[] {
  const out: Series[] = []
  const list = asArr<unknown>(raw)
  if (list.length > 0 && list.every((v) => !v || typeof v !== 'object')) {
    out.push({ name: '', values: padValues(list, len) })
    return out
  }
  for (const s of list) {
    if (!s || typeof s !== 'object') continue
    const o = s as Record<string, unknown>
    out.push({ name: str(o.name), values: padValues(asArr(o.values), len) })
    if (out.length >= MAX_HUES) break
  }
  return out
}

function padValues(values: unknown[], len: number): Array<number | null> {
  const r: Array<number | null> = []
  for (let i = 0; i < len; i++) r.push(numOrNull(values[i]))
  return r
}

export function readCategories(raw: unknown): string[] {
  return asArr<unknown>(raw).map(str)
}

/** True when no finite, non-zero value exists. */
export function noData(series: ReadonlyArray<Series>): boolean {
  return !series.some((s) => s.values.some((v) => isNum(v) && v !== 0))
}

/* ───────────────────────────── number formatting ───────────────────────────── */

const trim = (s: string) => (s.includes('.') ? s.replace(/\.?0+$/, '') : s)

/** Axis / label number: trimmed (no "50.0"), grouped thousands, shared format vocabulary. */
export function fmtNum(v: number, format?: string): string {
  if (!isNum(v)) return ''
  const r = Math.round(v * 1e6) / 1e6
  switch (format) {
    case 'compact': {
      const a = Math.abs(r)
      if (a >= 1e9) return `${trim((r / 1e9).toFixed(1))}B`
      if (a >= 1e6) return `${trim((r / 1e6).toFixed(1))}M`
      if (a >= 1e3) return `${trim((r / 1e3).toFixed(1))}K`
      return trim(r.toFixed(1))
    }
    case 'percent':
      return `${trim(r.toFixed(1))}%`
    case 'currency':
      return formatValue(r, 'currency')
    default:
      return Number.isInteger(r) ? r.toLocaleString('en-US') : trim(r.toFixed(2))
  }
}

/** Signed variant: "+12", "-3" (a true minus is avoided: it is missing from some fonts). */
export function fmtSigned(v: number, format?: string): string {
  const s = fmtNum(Math.abs(v), format)
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : s
}

export function enumOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(v as string) ? (v as T) : fallback
}

/* ───────────────────────────── axis ───────────────────────────── */

export interface NiceAxis {
  min: number
  max: number
  ticks: number[]
}

/** 1-2-5 nice axis that always contains `[lo, hi]`. Degenerate ranges get a unit extent. */
export function niceAxis(lo: number, hi: number, target = 5): NiceAxis {
  let a = isNum(lo) ? lo : 0
  let b = isNum(hi) ? hi : 1
  if (a > b) [a, b] = [b, a]
  if (a === b) {
    if (a === 0) b = 1
    else {
      const pad = Math.abs(a) * 0.1 || 1
      a -= pad
      b += pad
    }
  }
  const raw = (b - a) / Math.max(1, target)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / mag
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag
  const min = Math.floor(a / step + 1e-9) * step
  const max = Math.ceil(b / step - 1e-9) * step
  const ticks: number[] = []
  for (let v = min, k = 0; v <= max + step * 1e-6 && k < 40; v += step, k++) ticks.push(Math.round(v * 1e9) / 1e9)
  return { min: Math.round(min * 1e9) / 1e9, max: Math.round(max * 1e9) / 1e9, ticks }
}

/* ───────────────────────────── text helpers ───────────────────────────── */

export function style(ctx: LayoutContext, token: TypeToken, color?: string): ResolvedTextStyle {
  const s = ctx.resolveText(token)
  return color ? { ...s, color } : s
}

export const lineH = (s: ResolvedTextStyle) => s.size * s.lineHeight

/** A text style whose colour is the muted role (readable on the surface). */
export function mutedStyle(ctx: LayoutContext, token: TypeToken = 'footnote'): ResolvedTextStyle {
  return style(ctx, token, ctx.resolveColor('textMuted').color)
}

/** The widest unbroken word of `text`, measured. */
export function longestWord(ctx: LayoutContext, text: string, s: ResolvedTextStyle): number {
  let w = 0
  for (const word of text.split(/\s+/)) if (word) w = Math.max(w, ctx.measureText(word, s).width)
  return w
}

/**
 * estimateMetrics is a per-length heuristic: real text can be up to ~35% wider. Any decision of
 * the form "does this label fit" multiplies the measured width by this.
 */
export const TEXT_SLACK = 1.3

/** Single-line text of fixed `box`, start-anchored. Truncates to one line. */
export function textNode(
  ctx: LayoutContext,
  text: string,
  s: ResolvedTextStyle,
  box: { x: number; y: number; width: number },
  part: string
): LayoutNode {
  const m = ctx.measureText(text, s, Math.max(1, box.width))
  return { k: 'text', part, box: { x: box.x, y: box.y, width: Math.max(1, box.width), height: m.height }, lines: m.lines, style: s }
}

/** One start-anchored line, ellipsised when it does not fit `box.width`; the box is one line tall. */
export function oneLine(
  ctx: LayoutContext,
  text: string,
  s: ResolvedTextStyle,
  box: { x: number; y: number; width: number },
  part: string
): LayoutNode {
  const m = ctx.measureText(text, s, Math.max(1, box.width))
  return { k: 'text', part, box: { x: box.x, y: box.y, width: Math.max(1, box.width), height: lineH(s) }, lines: clipLines(m.lines, 1), style: s }
}

/**
 * A context whose `measureText` reports the browser-true width for single-line strings (line
 * breaking is still the base estimate's). Alignment and "does it fit" decisions read widths.
 */
export function withRealWidths(ctx: LayoutContext): LayoutContext {
  return {
    ...ctx,
    measureText: (text, style, maxWidth) => {
      if (typeof text !== 'string' || text.includes('\n')) return ctx.measureText(text, style, maxWidth)
      // +2%: the box must never be a hair narrower than the glyphs (the DOM would wrap it).
      const width = Math.ceil(realWidth(text, style) * 1.02)
      // A line that fits by the browser-true width never wraps, whatever the flat estimate says.
      if (width <= (maxWidth ?? Infinity)) {
        const m = ctx.measureText(text, style)
        if (m.lines.length !== 1) return m
        return { ...m, width, lines: m.lines.map((l) => ({ ...l, width })) }
      }
      // Wider than the box: wrap at spaces with real widths (the estimator breaks at other places).
      const real = wrapReal(text, style, maxWidth as number)
      if (!real || real.length < 2) return ctx.measureText(text, style, maxWidth)
      const lh = style.size * style.lineHeight
      const lines = real.map((t, i) => ({ text: t, top: Math.round(i * lh), baseline: Math.round(i * lh + lh * 0.8), width: Math.ceil(realWidth(t, style) * 1.02) }))
      return { width: Math.max(1, ...lines.map((l) => l.width)), height: Math.round(lines.length * lh) + 2, lines }
    },
  }
}

/** Placed text with start / center / end alignment inside `box`. */
export function textAligned(
  ctx: LayoutContext,
  text: string,
  s: ResolvedTextStyle,
  box: { x: number; y: number; width: number },
  align: 'start' | 'center' | 'end',
  part: string
): { nodes: LayoutNode[]; height: number; width: number } {
  // End / centre anchoring depends on the line width: use the browser-true Inter widths so a
  // right-aligned value ends on the edge instead of overshooting it (RV04).
  const p = placeText(align === 'start' ? ctx : withRealWidths(ctx), text, s, box, align, { part, linePart: (i) => (i === 0 ? part : `${part}.${i}`) })
  return { nodes: p.nodes, height: p.height, width: Math.max(0, ...p.lines.map((l) => l.width)) }
}

/** Keep at most `max` lines of a measured label, ending the last with an ellipsis. */
export function clipLines<T extends { text: string }>(lines: T[], max: number): T[] {
  if (lines.length <= max) return lines
  const keep = lines.slice(0, Math.max(1, max))
  const last = keep[keep.length - 1]
  keep[keep.length - 1] = { ...last, text: `${last.text.replace(/[\s.,;:]+$/, '')}…` }
  return keep
}

/* ───────────────────────────── nodes ───────────────────────────── */

export function root(ctx: LayoutContext, children: LayoutNode[]): LayoutNode {
  return {
    k: 'group',
    part: 'root',
    box: { x: 0, y: 0, width: Math.max(0, ctx.box.width), height: Math.max(0, ctx.box.height) },
    children,
  }
}

export function fullBox(ctx: LayoutContext): Box {
  return { x: 0, y: 0, width: Math.max(0, ctx.box.width), height: Math.max(0, ctx.box.height) }
}

/** Muted centred "No data" text, the empty state of every chart. */
export function emptyState(ctx: LayoutContext, label = 'No data'): LayoutNode {
  const s = mutedStyle(ctx, 'body')
  const W = Math.max(1, ctx.box.width)
  const t = textAligned(ctx, label, s, { x: 0, y: 0, width: W }, 'center', 'empty')
  const y = Math.max(0, (ctx.box.height - t.height) / 2)
  const nodes = t.nodes.map((n) => ({ ...n, box: { ...n.box, y: n.box.y + y } }) as LayoutNode)
  return root(ctx, nodes)
}

/** A solid-filled rect. Negative or NaN sizes are clamped so a bad value never poisons the tree. */
export function solidRect(box: Box, color: string, part: string, radius?: number): LayoutNode {
  const w = isNum(box.width) ? Math.max(0, box.width) : 0
  const h = isNum(box.height) ? Math.max(0, box.height) : 0
  return {
    k: 'rect',
    part,
    box: { x: isNum(box.x) ? box.x : 0, y: isNum(box.y) ? box.y : 0, width: w, height: h },
    fill: { type: 'solid', color },
    ...(radius !== undefined ? { radius: Math.min(radius, w / 2, h / 2) } : {}),
  }
}

/** A filled dot (rect with a full radius). */
export function dot(cx: number, cy: number, r: number, color: string, part: string, ring?: string): LayoutNode {
  return {
    k: 'rect',
    part,
    box: { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r },
    fill: { type: 'solid', color },
    radius: r,
    ...(ring ? { stroke: { color: ring, width: 2 } } : {}),
  }
}

/** A path in absolute block coordinates. */
export function pathNode(ctx: LayoutContext, d: string, part: string, o: { fill?: string; stroke?: string; strokeWidth?: number }): LayoutNode {
  return {
    k: 'path',
    part,
    box: fullBox(ctx),
    d,
    ...(o.fill ? { fill: { type: 'solid', color: o.fill } as const } : {}),
    ...(o.stroke ? { stroke: { color: o.stroke, width: o.strokeWidth ?? 2 } } : {}),
  }
}

/** Faded group: lets overlapping fills stay readable without an alpha channel on Paint. */
export function faded(ctx: LayoutContext, opacity: number, children: LayoutNode[]): LayoutNode {
  return { k: 'group', opacity, box: fullBox(ctx), children }
}

/* ───────────────────────────── colours ───────────────────────────── */

export interface ChartColors {
  surface: string
  text: string
  muted: string
  line: string
  grid: string
  accent: string
  /** Track / background tint, a quiet fill. */
  track: string
}

export function chartColors(ctx: LayoutContext): ChartColors {
  const surface = ctx.resolveColor('surface').color
  const line = ctx.resolveColor('line').color
  return {
    surface,
    text: ctx.resolveColor('text').color,
    muted: ctx.resolveColor('textMuted').color,
    line,
    grid: tintOf(surface, line, 0.55),
    accent: ctx.resolveColor('accent').color,
    track: tintOf(surface, line, 0.4),
  }
}

/** Series colours: one series is `accent`, more walk the categorical ramp (<= MAX_HUES). */
export function seriesColors(ctx: LayoutContext, count: number): string[] {
  if (count <= 0) return []
  if (count === 1) return [ctx.resolveColor('accent').color]
  const cats = ctx.tokens.categorical
  return Array.from({ length: Math.min(count, MAX_HUES) }, (_, i) => cats[i % cats.length])
}

/** A deliberately quiet version of a colour for non-highlighted marks. */
export function dimmed(c: ChartColors, color: string): string {
  return tintOf(c.surface, color, 0.4)
}

/* ───────────────────────────── cartesian pieces ───────────────────────────── */

export const GRID_W = 2
export const AXIS_W = 3
export const PLOT_PAD = 8

/**
 * AC4 chart look (ai-curation §2.3 rank 7), read from the deck tokens — no new token group: the
 * deck card surface (`DeckTokens.surface`) and the radius scale already say how heavy and how round
 * a style is. With no surface every value is the pre-AC4 constant, so an unstyled deck is unchanged.
 * - `barRadius`: `radius.sm` (corporate 4, minimal 6, gradient 12), capped by the bar (single and
 *   grouped bars; stacked segments stay square, they share edges);
 * - `lineWidth`: 5; a `bold` stroke style 7, a `hairline` one 4;
 * - `gridWidth`: 2; quiet surfaces (`ghost`, `outline`) 1, a `bold` stroke 3.
 */
export interface ChartLook {
  barRadius: number
  lineWidth: number
  gridWidth: number
}

export function chartLook(ctx: LayoutContext): ChartLook {
  const s = ctx.tokens.surface
  if (!s) return { barRadius: 0, lineWidth: 5, gridWidth: GRID_W }
  return {
    barRadius: ctx.tokens.radius.sm,
    lineWidth: s.stroke === 'bold' ? 7 : s.stroke === 'hairline' ? 4 : 5,
    gridWidth: s.stroke === 'bold' ? 3 : s.card === 'ghost' || s.card === 'outline' ? 1 : GRID_W,
  }
}

export interface YAxis {
  /** Plot box (after the label column on the left). */
  plot: Box
  y(v: number): number
  nodes: LayoutNode[]
}

/**
 * Value axis along the left: tick labels (end-aligned, in a column sized from the measured
 * labels), recessive gridlines across the plot, and a firm zero / baseline rule.
 *
 * `area` is the box that holds axis and plot together; `rightPad` keeps room for end labels.
 */
export function valueAxisLeft(
  ctx: LayoutContext,
  area: Box,
  axis: NiceAxis,
  o: { format?: string; gridlines: boolean; rightPad?: number; c: ChartColors }
): YAxis {
  const s = mutedStyle(ctx, 'footnote')
  const labels = axis.ticks.map((t) => fmtNum(t, o.format))
  const colW = Math.min(area.width * 0.3, Math.ceil(Math.max(0, ...labels.map((l) => ctx.measureText(l, s).width)) * 1.2) + 2)
  const plot: Box = {
    x: area.x + colW + PLOT_PAD,
    y: area.y,
    width: Math.max(0, area.width - colW - PLOT_PAD - (o.rightPad ?? 0)),
    height: Math.max(0, area.height),
  }
  const span = axis.max - axis.min || 1
  const y = (v: number) => plot.y + plot.height * (1 - clamp((v - axis.min) / span, 0, 1))
  const nodes: LayoutNode[] = []
  const lh = lineH(s)
  axis.ticks.forEach((t, i) => {
    const ty = y(t)
    const zeroInRange = axis.min < -1e-9 && axis.max > 1e-9
    const isBase = zeroInRange ? Math.abs(t) < 1e-9 : i === 0
    if (o.gridlines || isBase) {
      const gw = isBase ? AXIS_W : chartLook(ctx).gridWidth
      nodes.push(solidRect({ x: plot.x, y: ty - gw / 2, width: plot.width, height: gw }, isBase ? o.c.line : o.c.grid, `grid[${i}]`))
    }
    const lab = textAligned(ctx, labels[i], s, { x: area.x, y: ty - lh / 2, width: colW }, 'end', `ytick[${i}]`)
    nodes.push(...lab.nodes)
  })
  return { plot, y, nodes }
}

/**
 * Category labels under a band axis. Labels wrap inside their band; when even wrapping cannot
 * fit them (a long unbroken word, or more than 2 lines) every n-th label is shown instead, so
 * neighbours never overlap. Returns the nodes and the height they need.
 */
export function categoryLabels(
  ctx: LayoutContext,
  cats: string[],
  centers: number[],
  step: number,
  y: number,
  part: (i: number) => string,
  opts: { color?: string; thin?: 'stride' | 'clip' } = {}
): { nodes: LayoutNode[]; height: number; stride: number } {
  const s = opts.color ? style(ctx, 'footnote', opts.color) : mutedStyle(ctx, 'footnote')
  const n = cats.length
  if (n === 0 || !(step > 0)) return { nodes: [], height: 0, stride: 1 }
  // Dry run with browser-true widths (RV05): every shown label wraps to at most two lines inside its
  // band, and after the edge labels are slid back into the block no two neighbours touch. The old
  // check compared only the longest *word* with the flat estimate, so a one-line label wider than its
  // stride was accepted and the clamped edge label ended up on top of its neighbour.
  const maxX0 = Math.max(0, ctx.box.width)
  const fits = (stride: number): boolean => {
    const w = step * stride
    let prevRight = -Infinity
    for (let i = 0; i < n; i += stride) {
      const lines = wrapReal(cats[i], s, w * 0.96)
      if (!lines || lines.length > 2) return false
      const lw = Math.max(...lines.map((l) => realWidth(l, s))) * 1.02
      const left = clamp(centers[i] - lw / 2, 0, Math.max(0, maxX0 - lw))
      if (left < prevRight + 2) return false
      prevRight = left + lw
    }
    return true
  }
  // `stride` thins the axis (right for a time axis); `clip` keeps every label and ellipsises the
  // ones that do not fit (right when each category matters: bars, waterfall steps).
  let stride = 1
  if (opts.thin !== 'clip') while (stride < n && !fits(stride)) stride++
  const w = step * stride
  const maxW = Math.max(1, w * 0.96)
  const nodes: LayoutNode[] = []
  let height = 0
  for (let i = 0; i < n; i += stride) {
    let text = cats[i]
    if (opts.thin === 'clip') text = clipToWidth(ctx, text, s, maxW)
    const t = textAligned(ctx, text, s, { x: centers[i] - w / 2, y, width: w * 0.96 }, 'center', part(i))
    // textAligned centres inside a box of width w*0.96 starting at x: re-centre on the band.
    const shift = (w - w * 0.96) / 2
    // Keep edge labels inside the block: slide them in rather than letting them hang out.
    const maxX = Math.max(0, ctx.box.width)
    nodes.push(
      ...t.nodes.map((nd) => {
        const x = clamp(nd.box.x + shift, 0, Math.max(0, maxX - nd.box.width))
        return { ...nd, box: { ...nd.box, x } } as LayoutNode
      })
    )
    height = Math.max(height, t.height)
  }
  return { nodes, height, stride }
}

/**
 * `text` limited to two lines of `maxW`: wraps at spaces, and cuts any single word (or a third
 * line) that still does not fit, ending it with an ellipsis.
 */
export function ellipsize(ctx: LayoutContext, word: string, s: ResolvedTextStyle, maxW: number): string {
  if (ctx.measureText(word, s).width <= maxW) return word
  let lo = 1
  let hi = word.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (ctx.measureText(`${word.slice(0, mid)}…`, s).width <= maxW) lo = mid
    else hi = mid - 1
  }
  return `${word.slice(0, lo)}…`
}

export function clipToWidth(ctx: LayoutContext, text: string, s: ResolvedTextStyle, maxW: number): string {
  const words = text.split(/\s+/).filter(Boolean).map((w) => ellipsize(ctx, w, s, maxW))
  const m = ctx.measureText(words.join(' '), s, maxW)
  if (m.lines.length <= 2) return words.join(' ')
  return clipLines(m.lines, 2).map((l) => l.text).join(' ')
}

/* ───────────────────────────── capacity ───────────────────────────── */

export function capacityOf(
  counts: Record<string, { max: number; used: number }>,
  extraOk = true,
  remedy: CapacityReport['remedy'] = [],
  unit: 'items' = 'items'
): CapacityReport {
  const budget: CapacityReport['budget'] = {}
  let fits = extraOk
  for (const [k, v] of Object.entries(counts)) {
    budget[k] = { max: v.max, used: v.used, unit }
    if (v.used > v.max) fits = false
  }
  return { fits, budget, remedy: fits ? [] : remedy }
}

export function sizeOf(ctx: LayoutContext): Size {
  return { width: Math.max(0, ctx.box.width), height: Math.max(0, ctx.box.height) }
}

export { onColor as inkOn }

/**
 * Annular sector (or a pie wedge when `rInner <= 0`) as ONE simple closed outline: outer arc
 * clockwise, a radial edge in, the inner arc back counter-clockwise on the same circle, close.
 *
 * Why not `_engine/arcPath`: it cuts the hole with a second wedge whose arc is drawn start -> end
 * with the opposite sweep flag. That is not the same circle reversed; SVG then picks the mirror
 * circle and the inner edge bows the wrong way (barely visible on a quarter slice, obvious on a
 * gauge band or a ring). A path that traces the outline once has no such ambiguity.
 *
 * Spans over 1.98 pi (a closed ring) are drawn as two halves: an arc whose end point almost
 * coincides with its start is ill-conditioned and renders as a blob.
 */
export function ringArcPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const span = a1 - a0
  if (span > Math.PI * 1.98) {
    const mid = a0 + span / 2
    return `${ringArcPath(cx, cy, rOuter, rInner, a0, mid)} ${ringArcPath(cx, cy, rOuter, rInner, mid, a1)}`
  }
  const f = (v: number) => String(Math.round(v * 100) / 100)
  const large = span > Math.PI ? 1 : 0
  const p = (r: number, a: number) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`
  if (!(rInner > 0)) return `M ${f(cx)} ${f(cy)} L ${p(rOuter, a0)} A ${f(rOuter)} ${f(rOuter)} 0 ${large} 1 ${p(rOuter, a1)} Z`
  return `M ${p(rOuter, a0)} A ${f(rOuter)} ${f(rOuter)} 0 ${large} 1 ${p(rOuter, a1)} L ${p(rInner, a1)} A ${f(rInner)} ${f(rInner)} 0 ${large} 0 ${p(rInner, a0)} Z`
}
