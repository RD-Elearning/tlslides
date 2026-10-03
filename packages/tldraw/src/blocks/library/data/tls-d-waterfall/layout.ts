/**
 * Pure layout for tls.d.waterfall — floating bars for the changes, full bars for the totals.
 *
 * A `delta` step floats from the running total to the new running total; a `total` step is a full
 * bar from zero (and resets the running total to its own value; a total with no number takes the
 * running total). Colours by sign use the `positive` / `negative` roles and `accent` for totals.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { WaterfallProps } from './schema'
import { WATERFALL_MAX_STEPS } from './schema'
import { bandScale } from '../_engine/multi-series'
import {
  asArr, capacityOf, categoryLabels, chartColors, emptyState, enumOf, fmtNum, fmtSigned, lineH, mutedStyle, niceAxis, numOrNull, root, solidRect, str,
  textAligned, TEXT_SLACK, valueAxisLeft,
} from '../_chart/kit'

interface Step {
  label: string
  kind: 'delta' | 'total'
  from: number
  to: number
  value: number
}

function readSteps(props: WaterfallProps): Step[] {
  const out: Step[] = []
  let cum = 0
  for (const raw of asArr<Record<string, unknown>>(props.steps).slice(0, WATERFALL_MAX_STEPS)) {
    if (!raw || typeof raw !== 'object') continue
    const kind = raw.kind === 'total' ? 'total' : 'delta'
    const v = numOrNull(raw.value)
    if (kind === 'total') {
      const to = v ?? cum
      out.push({ label: str(raw.label), kind, from: 0, to, value: to })
      cum = to
    } else {
      const d = v ?? 0
      out.push({ label: str(raw.label), kind, from: cum, to: cum + d, value: d })
      cum += d
    }
  }
  return out
}

export function layout(props: WaterfallProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const steps = readSteps(props)
  if (steps.length < 1 || steps.every((s) => s.from === 0 && s.to === 0)) return emptyState(ctx)

  const c = chartColors(ctx)
  const N = steps.length
  const lo = Math.min(0, ...steps.flatMap((s) => [s.from, s.to]))
  const hi = Math.max(0, ...steps.flatMap((s) => [s.from, s.to]))
  const axis = niceAxis(lo, hi, 5)
  const ls = mutedStyle(ctx, 'footnote')
  const lh = lineH(ls)
  const showValues = props.valueLabels !== 'none'
  const gridlines = props.gridlines !== 'none'
  const colorBy = enumOf(props.colorBy, ['sign', 'single'] as const, 'sign')
  const nodes: LayoutNode[] = []

  const topPad = lh / 2 + 2 + (showValues ? lh + 4 : 0)
  const base = { x: 0, y: topPad, width: W, height: Math.max(0, H - topPad) }
  const cats = steps.map((s) => s.label)
  const probe = valueAxisLeft(ctx, { ...base, height: 100 }, axis, { format: props.format, gridlines, rightPad: 4, c })
  const bands = bandScale(cats, [probe.plot.x, probe.plot.x + probe.plot.width], 0.3)
  const centers = cats.map((_, i) => probe.plot.x + bands.step * i + bands.step / 2)
  const lab0 = categoryLabels(ctx, cats, centers, bands.step, 0, (i) => `cat[${i}]`, { thin: 'clip' })
  const gapX = lab0.height > 0 ? lh / 2 + 6 : 0
  const ax = valueAxisLeft(ctx, { ...base, height: Math.max(0, base.height - lab0.height - gapX) }, axis, { format: props.format, gridlines, rightPad: 4, c })
  nodes.push(...ax.nodes)
  nodes.push(...categoryLabels(ctx, cats, centers, bands.step, ax.plot.y + ax.plot.height + gapX, (i) => `cat[${i}]`, { thin: 'clip' }).nodes)

  const colorOf = (s: Step) =>
    colorBy === 'single' || s.kind === 'total' ? c.accent : ctx.resolveColor(s.value >= 0 ? 'positive' : 'negative').color
  const labelsFit = steps.every((s) => ctx.measureText(s.kind === 'total' ? fmtNum(s.value, props.format) : fmtSigned(s.value, props.format), ls).width * TEXT_SLACK <= bands.bandwidth * 1.1)

  steps.forEach((s, i) => {
    const yA = ax.y(s.from)
    const yB = ax.y(s.to)
    const x = bands.start(i)
    const top = Math.min(yA, yB)
    const h = Math.max(Math.abs(yA - yB), 1)
    nodes.push(solidRect({ x, y: top, width: bands.bandwidth, height: h }, colorOf(s), `bar[${i}]`, 2))
    if (showValues && labelsFit) {
      const txt = s.kind === 'total' ? fmtNum(s.value, props.format) : fmtSigned(s.value, props.format)
      const tw = ctx.measureText(txt, ls).width * 1.12
      nodes.push(...textAligned(ctx, txt, { ...ls, color: c.text }, { x: centers[i] - tw / 2, y: top - lh - 2, width: tw }, 'center', `value[${i}]`).nodes)
    }
    if (props.connectors !== false && i < N - 1) {
      const y = ax.y(s.to)
      const x0 = x + bands.bandwidth
      nodes.push(solidRect({ x: x0, y: y - 1, width: Math.max(0, bands.start(i + 1) - x0), height: 2 }, c.muted, `connector[${i}]`))
    }
  })
  return root(ctx, nodes)
}

export function capacity(props: WaterfallProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf({ steps: { max: WATERFALL_MAX_STEPS, used: asArr(props.steps).length } }, true, [{ kind: 'truncate', slot: 'steps' }])
}
