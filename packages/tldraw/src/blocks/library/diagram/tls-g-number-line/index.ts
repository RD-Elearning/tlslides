/**
 * tls.g.number-line — spro sprint 2026-11b S09-9: a number line or scale from `min` to `max` with marked
 * points and intervals (maths, measurement, grading scales). Tick labels are numbers formatted in the
 * deck language (`localizeNumber`: "2.5" → "2,5" in Vietnamese); point labels sit above the line in up
 * to three levels so they never overlap; intervals are bars under the tick labels, one row each.
 * `ruler` adds minor ticks; `thermometer` draws the line as a filled tube up to the first point.
 * Points or intervals outside [min, max] are validation errors (`lint`), drawn clamped to the ends.
 */
import type { BlockDefinition, BlockSchema, CapacityReport, LayoutContext, LayoutNode, LintFinding, MotionRecipe, TypeToken } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { localizeNumber } from '../../data/_engine/format-value'
import { asArr, capacityOf, chartColors, clamp, emptyState, enumOf, lineH, linesHeight, numOrNull, objs, placeLines, root, showsWhole, str, style, mutedStyle, tierStart, tintOf } from '../_kit'
import { slot, STEP } from '../_motion'

const VARIANTS = ['line', 'ruler', 'thermometer'] as const

export interface NumberLineProps extends Record<string, unknown> {
  min: number
  max: number
  step?: number
  points: Array<{ value: number; label: string }>
  intervals?: Array<{ from: number; to: number; label: string }>
  variant?: (typeof VARIANTS)[number]
}

const field = (kind: 'number' | 'text', label: string, req = true, maxChars?: number) => ({ type: kind === 'text' ? { kind, ...(maxChars ? { maxChars } : {}) } : { kind }, role: 'content' as const, label, ...(req ? { required: true } : {}) })

export const schema: BlockSchema = {
  min: { type: { kind: 'number' }, role: 'content', label: 'From', required: true, guidance: 'The value at the left end.' },
  max: { type: { kind: 'number' }, role: 'content', label: 'To', required: true, guidance: 'The value at the right end (greater than `min`).' },
  step: { type: { kind: 'number' }, role: 'content', label: 'Step', help: 'Distance between ticks (absent = a round step, about ten ticks).' },
  points: {
    type: { kind: 'list', of: { kind: 'object', fields: { value: field('number', 'value'), label: field('text', 'label', true, 24) } as never }, min: 1, max: 6 },
    role: 'content',
    label: 'Points',
    required: true,
    guidance: 'Each: `value` (between min and max) and `label` (≤ 24).',
  },
  intervals: {
    type: { kind: 'list', of: { kind: 'object', fields: { from: field('number', 'from'), to: field('number', 'to'), label: field('text', 'label', true, 24) } as never }, min: 0, max: 3 },
    role: 'content',
    label: 'Intervals',
    guidance: 'Ranges to mark: `from`, `to` (within min..max) and `label` (≤ 24), e.g. a grade band.',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'line (default), ruler (minor ticks) or thermometer (a tube filled to the first point).'),
}

export const defaults: NumberLineProps = {
  min: -5,
  max: 5,
  step: 1,
  points: [
    { value: -3, label: 'Debt of 3' },
    { value: 0, label: 'Zero' },
    { value: 2.5, label: 'Half way to 5' },
  ],
  intervals: [{ from: 0, to: 5, label: 'Positive numbers' }],
  variant: 'line',
}

/** A round tick step for about ten ticks over `span`. */
export function niceStep(span: number): number {
  if (!(span > 0)) return 1
  const raw = span / 10
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p
  return 10 * p
}

/** A tick value in the deck language: English digits first ("1,240.5"), then `localizeNumber`. */
export function tickText(v: number, step: number, locale?: string): string {
  const decimals = Math.max(0, Math.min(4, -Math.floor(Math.log10(Math.abs(step) || 1) + 1e-9) + (String(step).includes('.') ? 0 : 0)))
  const fixed = Math.abs(v) < 1e-9 ? '0' : v.toFixed(Number.isInteger(step) ? 0 : Math.max(decimals, (String(step).split('.')[1] ?? '').length))
  const [int, frac] = fixed.replace('-', '').split('.')
  const en = (v < 0 && fixed !== '0' ? '−' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac ? `.${frac}` : '')
  return localizeNumber(en, locale)
}

type Tier = { label: TypeToken; tick: TypeToken }
const TIERS: readonly Tier[] = [
  { label: 'lead', tick: 'body' },
  { label: 'body', tick: 'caption' },
  { label: 'caption', tick: 'footnote' },
  { label: 'footnote', tick: 'footnote' },
]

function range(props: NumberLineProps): { lo: number; hi: number; step: number } | null {
  const lo = numOrNull(props.min)
  const hi = numOrNull(props.max)
  if (lo === null || hi === null || !(hi > lo)) return null
  const s = numOrNull(props.step)
  const step = s !== null && s > 0 && (hi - lo) / s <= 40 ? s : niceStep(hi - lo)
  return { lo, hi, step }
}

export function layout(props: NumberLineProps, ctx: LayoutContext): LayoutNode {
  for (const t of TIERS.slice(tierStart(ctx, TIERS.length), -1)) {
    const node = layoutTier(props, ctx, t)
    if (node) return node
  }
  return layoutTier(props, ctx, null) as LayoutNode
}

function layoutTier(props: NumberLineProps, ctx: LayoutContext, pick: Tier | null): LayoutNode | null {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const r = range(props)
  if (!r) return emptyState(ctx, 'No range')
  const tier = pick ?? TIERS[TIERS.length - 1]
  const c = chartColors(ctx)
  const accent = ctx.resolveColor('accent').color
  const variant = enumOf(props.variant, VARIANTS, 'line')
  const lS = style(ctx, tier.label, c.text)
  const kS = mutedStyle(ctx, tier.tick)
  const sp = ctx.tokens.space
  const points = objs(props.points).slice(0, 6).map((p) => ({ v: numOrNull(p.value), label: str(p.label).slice(0, 24) })).filter((p): p is { v: number; label: string } => p.v !== null)
  const intervals = objs(props.intervals).slice(0, 3).map((p) => ({ a: numOrNull(p.from), b: numOrNull(p.to), label: str(p.label).slice(0, 24) })).filter((p): p is { a: number; b: number; label: string } => p.a !== null && p.b !== null)
  const ticks: number[] = []
  for (let k = 0; ; k++) {
    const v = r.lo + k * r.step
    if (v > r.hi + r.step * 1e-6 || k > 60) break
    ticks.push(Math.round(v / r.step) * r.step)
  }
  const tickTexts = ticks.map((v) => tickText(v, r.step, ctx.tokens.locale))
  const tw = Math.max(...tickTexts.map((t) => ctx.measureText(t, kS).width))
  const labelW = (t: string) => Math.min(W * 0.3, Math.ceil(ctx.measureText(t, lS).width) + 4)
  const m = Math.max(tw / 2 + 4, ...points.map((p) => labelW(p.label) / 2), 24) + (variant === 'thermometer' ? 40 : 0)
  const x = (v: number) => m + ((clamp(v, r.lo, r.hi) - r.lo) / (r.hi - r.lo)) * Math.max(0, W - 2 * m)
  // point labels: lowest free level (of 3), label centred over its point, kept in the box
  const lh = lineH(lS)
  const placed: Array<{ x: number; w: number; level: number }> = []
  for (const p of points) {
    const w = labelW(p.label)
    const lx = clamp(x(p.v) - w / 2, 0, Math.max(0, W - w))
    let level = 0
    while (level < 3 && placed.some((q) => q.level === level && lx < q.x + q.w + 12 && q.x < lx + w + 12)) level++
    if (level >= 3) {
      if (pick) return null
      level = 2
    }
    placed.push({ x: lx, w, level })
  }
  const levels = Math.max(1, ...placed.map((q) => q.level + 1))
  // each level as tall as its tallest label; level 0 sits nearest the line
  const lvH = Array.from({ length: levels }, (_, k) => Math.max(lh, ...points.map((p, i) => (placed[i].level === k ? linesHeight(ctx, p.label, lS, placed[i].w, 2) : 0))))
  const lvTop: number[] = []
  let acc = 0
  for (let k = levels - 1; k >= 0; k--) {
    lvTop[k] = acc
    acc += lvH[k] + sp.xs
  }
  const labelBand = acc + sp.sm
  const tube = variant === 'thermometer' ? 28 : 0
  const axisY = labelBand + 16 + tube / 2
  const tickLen = variant === 'ruler' ? 22 : 12
  const tickTop = axisY - tickLen / 2
  const tickLabelY = axisY + Math.max(tickLen / 2, tube / 2) + sp.xs
  const bandTop = tickLabelY + lineH(kS) + sp.md
  const barH = 14
  const rowH = barH + sp.xs + lh + sp.sm
  // interval rows: an interval shares a row with those whose bar and label it does not touch
  const ivRow: number[] = []
  const spans: Array<Array<[number, number]>> = []
  intervals.forEach((iv, i) => {
    const a = x(Math.min(iv.a, iv.b))
    const b = x(Math.max(iv.a, iv.b))
    const w = Math.min(W, Math.ceil(ctx.measureText(iv.label, lS).width) + 4)
    const lx = clamp((a + b) / 2 - w / 2, 0, Math.max(0, W - w))
    const span: [number, number] = [Math.min(a, lx), Math.max(b, lx + w)]
    let row = 0
    while ((spans[row] ?? []).some(([p, q]) => span[0] < q + 8 && p < span[1] + 8)) row++
    ;(spans[row] ??= []).push(span)
    ivRow[i] = row
  })
  const total = bandTop + spans.length * rowH
  if (total > H + 0.5 && pick) return null
  const dy = Math.max(0, (H - total) / 2)
  const out: LayoutNode[] = []
  const Y = (v: number) => v + dy
  // the line
  if (variant === 'thermometer') {
    const bulb = 56
    out.push({ k: 'rect', part: 'axis', box: { x: m - 20, y: Y(axisY - tube / 2), width: Math.max(0, W - 2 * m + 20), height: tube }, fill: { type: 'solid', color: tintOf(c.surface, c.line, 0.25) }, radius: tube / 2 })
    const level = points.length ? x(points[0].v) : m
    out.push({ k: 'rect', part: 'fill', box: { x: m - 20, y: Y(axisY - tube / 2 + 6), width: Math.max(0, level - m + 20), height: tube - 12 }, fill: { type: 'solid', color: accent }, radius: (tube - 12) / 2 })
    out.push({ k: 'rect', part: 'bulb', box: { x: m - 20 - bulb / 2 - 4, y: Y(axisY - bulb / 2), width: bulb, height: bulb }, fill: { type: 'solid', color: accent }, radius: bulb / 2 })
  } else {
    out.push({ k: 'rect', part: 'axis', box: { x: m - 8, y: Y(axisY - 2), width: Math.max(0, W - 2 * m + 16), height: 4 }, fill: { type: 'solid', color: c.text }, radius: 2 })
  }
  // ticks and their labels (every 2nd / 5th label when they would touch)
  const gapPx = Math.max(0, W - 2 * m) / Math.max(1, ticks.length - 1)
  const every = [1, 2, 5, 10].find((e) => gapPx * e >= tw + 12) ?? 10
  ticks.forEach((v, i) => {
    const tx = x(v)
    out.push({ k: 'rect', part: `tick[${i}]`, box: { x: tx - 1.5, y: Y(tickTop), width: 3, height: tickLen }, fill: { type: 'solid', color: c.text } })
    if (variant === 'ruler' && i < ticks.length - 1) {
      for (let k = 1; k < 5; k++) out.push({ k: 'rect', part: `minor[${i * 4 + k - 1}]`, box: { x: tx + (gapPx * k) / 5 - 1, y: Y(axisY - 5), width: 2, height: 10 }, fill: { type: 'solid', color: c.muted } })
    }
    if (i % every === 0 || i === ticks.length - 1) {
      const t = tickTexts[i]
      const w = Math.ceil(ctx.measureText(t, kS).width) + 4
      if (i === ticks.length - 1 && i % every !== 0 && (i - (i % every)) * gapPx + tw + 12 > i * gapPx) return
      out.push(...placeLines(ctx, t, kS, { x: tx - w / 2, y: Y(tickLabelY), width: w }, 'center', 1, `tickLabel[${i}]`).nodes)
    }
  })
  // points
  points.forEach((p, i) => {
    const px = x(p.v)
    const q = placed[i]
    const kids: LayoutNode[] = [{ k: 'rect', part: `dot[${i}]`, box: { x: px - 10, y: Y(axisY - 10), width: 20, height: 20 }, fill: { type: 'solid', color: accent }, stroke: { color: c.surface, width: 3 }, radius: 10 }]
    const h = linesHeight(ctx, p.label, lS, q.w, 2)
    const top = Y(lvTop[q.level] + lvH[q.level] - h)
    kids.push(...placeLines(ctx, p.label, lS, { x: q.x, y: top, width: q.w }, 'center', 2, `label[${i}]`).nodes)
    // leader from the label down to the dot
    const from = top + h + 4
    const to = Y(axisY - 12)
    if (to - from > 4) kids.push({ k: 'rect', part: `leader[${i}]`, box: { x: px - 1, y: from, width: 2, height: to - from }, fill: { type: 'solid', color: tintOf(c.surface, accent, 0.6) } })
    out.push(slot(`point[${i}]`, { width: W, height: H }, kids))
  })
  // intervals
  intervals.forEach((iv, i) => {
    const a = x(Math.min(iv.a, iv.b))
    const b = x(Math.max(iv.a, iv.b))
    const y = Y(bandTop + ivRow[i] * rowH)
    const kids: LayoutNode[] = [{ k: 'rect', part: `bar[${i}]`, box: { x: a, y, width: Math.max(4, b - a), height: barH }, fill: { type: 'solid', color: tintOf(c.surface, accent, 0.45) }, radius: barH / 2 }]
    const w = Math.min(W, Math.ceil(ctx.measureText(iv.label, lS).width) + 4)
    kids.push(...placeLines(ctx, iv.label, lS, { x: clamp((a + b) / 2 - w / 2, 0, Math.max(0, W - w)), y: y + barH + sp.xs, width: w }, 'center', 1, `intervalLabel[${i}]`).nodes)
    out.push(slot(`interval[${i}]`, { width: W, height: H }, kids))
  })
  const tree = root(ctx, out)
  return pick && !showsWhole(ctx, tree) ? null : tree
}

export function capacity(props: NumberLineProps): CapacityReport {
  return capacityOf({ points: { max: 6, used: asArr(props.points).length }, intervals: { max: 3, used: asArr(props.intervals).length } }, true, [{ kind: 'truncate', slot: 'points' }])
}

/** Points and intervals outside [min, max], or max ≤ min: validation errors (never patched). */
export function lint(props: NumberLineProps): LintFinding[] {
  const lo = numOrNull(props.min)
  const hi = numOrNull(props.max)
  if (lo === null || hi === null) return []
  if (!(hi > lo)) return [{ level: 'error', rule: 'number-line/range', part: 'max', message: `max (${hi}) must be greater than min (${lo}).` }]
  const out: LintFinding[] = []
  objs(props.points).forEach((p, i) => {
    const v = numOrNull(p.value)
    if (v !== null && (v < lo || v > hi)) out.push({ level: 'error', rule: 'number-line/outside', part: `points[${i}].value`, message: `Point ${i + 1} (${v}) is outside ${lo}..${hi}; widen min/max or move the point.` })
  })
  objs(props.intervals).forEach((p, i) => {
    for (const k of ['from', 'to'] as const) {
      const v = numOrNull(p[k])
      if (v !== null && (v < lo || v > hi)) out.push({ level: 'error', rule: 'number-line/outside', part: `intervals[${i}].${k}`, message: `Interval ${i + 1} ${k} (${v}) is outside ${lo}..${hi}.` })
    }
  })
  return out
}

export const motion: MotionRecipe = {
  parts: ['axis', 'tick[*]', 'tickLabel[*]', 'point[*]', 'interval[*]'],
  preset: 'sweep-nodes',
  partMotion: {
    axis: { preset: 'sweep-nodes', delay: 0 },
    'tick[*]': { preset: 'sweep-nodes', delay: 60, stagger: 20 },
    'tickLabel[*]': { preset: 'sweep-nodes', delay: 100, stagger: 20 },
    'point[*]': { preset: 'field-in', delay: 400, stagger: STEP },
    'interval[*]': { preset: 'sweep-nodes', delay: 400 + STEP * 3, stagger: STEP },
  },
}

export const tlsGNumberLine: BlockDefinition = {
  type: 'tls.g.number-line',
  name: 'Number line',
  family: 'diagram',
  tier: 'A',
  summary: 'A number line or scale with marked points and intervals; numbers in the deck language.',
  keywords: ['number line', 'scale', 'axis', 'ruler', 'interval', 'trục số', 'thang đo', 'khoảng'],
  category: 'relationship',
  scope: 'group',
  shortDescription: 'A number line with marked points and intervals',
  related: ['tls.d.progress-bar', 'tls.g.timeline', 'tls.t.formula'],
  describe: {
    when: 'Values on a scale: points on a number line, a measurement scale, a grading scale with bands, where the position of each value is the point.',
    avoid: 'Events in time: tls.g.timeline. Amounts to compare: a bar chart. Progress towards a goal: tls.d.progress-bar.',
    example: { id: 'b_number_line', type: 'tls.g.number-line', props: { min: -5, max: 5, step: 1, points: defaults.points, intervals: defaults.intervals } },
  },
  schema,
  defaults,
  size: { preferred: [1600, 520], min: [900, 380] },
  lintIsValidation: true,
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
  lint: lint as BlockDefinition['lint'],
}
