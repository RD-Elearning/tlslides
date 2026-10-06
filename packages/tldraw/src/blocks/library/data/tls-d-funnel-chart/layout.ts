/**
 * Pure layout for tls.d.funnel-chart — one row per stage: name on the left, a shape sized by value,
 * and (optionally) the percentage lost since the previous stage on the right.
 *
 * `funnel` draws centred trapezoids whose bottom edge meets the next stage's top edge; `bars`
 * draws left-aligned bars on one baseline. Stage colour is an accent ramp (darkest first).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { FunnelChartProps } from './schema'
import { FUNNEL_MAX_STAGES } from './schema'
import {
  asArr, capacityOf, chartColors, emptyState, enumOf, fmtNum, fmtSigned, lineH, mutedStyle, numOrNull, onColor, pathNode, readableOn, root, solidRect, str,
  style, textAligned, tintOf, TEXT_SLACK,
  withRealWidths,
} from '../_chart/kit'

export function layout(props: FunnelChartProps, ctx0: LayoutContext): LayoutNode {
  // Browser-true single-line widths for every label decision (RV05).
  const ctx = withRealWidths(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const stages = asArr<Record<string, unknown>>(props.stages)
    .slice(0, FUNNEL_MAX_STAGES)
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({ label: str(s.label), value: Math.max(0, numOrNull(s.value) ?? 0) }))
  const N = stages.length
  const maxV = Math.max(0, ...stages.map((s) => s.value))
  if (N < 1 || !(maxV > 0)) return emptyState(ctx)

  const c = chartColors(ctx)
  const shape = enumOf(props.shape, ['funnel', 'bars'] as const, 'funnel')
  const dropoff = props.showDropoff !== 'none'
  const ns = style(ctx, 'caption', c.text)
  const vs = style(ctx, 'caption', c.text)
  const ds = mutedStyle(ctx, 'footnote')
  const lh = lineH(ns)
  const sp = ctx.tokens.space

  const labelW = Math.min(W * 0.28, Math.ceil(Math.max(...stages.map((s) => ctx.measureText(s.label, ns).width)) * TEXT_SLACK) + 2)
  const dropTexts = stages.map((s, i) => (i === 0 || stages[i - 1].value <= 0 ? '' : `${fmtSigned(Math.round(((s.value - stages[i - 1].value) / stages[i - 1].value) * 100))}%`))
  const dropW = dropoff ? Math.ceil(Math.max(0, ...dropTexts.map((t) => ctx.measureText(t, ds).width)) * TEXT_SLACK) + 4 : 0
  const gap = sp.xs
  const sx = labelW + gap
  const sw = Math.max(1, W - sx - (dropW ? dropW + gap : 0))
  const rowGap = 4
  const rowH = Math.min(96, Math.max(1, (H - (N - 1) * rowGap) / N))
  const total = N * rowH + (N - 1) * rowGap
  const y0 = Math.max(0, (H - total) / 2)
  const cx = sx + sw / 2
  const wOf = (v: number) => Math.max(2, (sw * v) / maxV)
  const colorOf = (i: number) => tintOf(c.surface, c.accent, N <= 1 ? 1 : 1 - (0.55 * i) / (N - 1))
  const nodes: LayoutNode[] = []

  stages.forEach((s, i) => {
    const y = y0 + i * (rowH + rowGap)
    const col = colorOf(i)
    const wTop = wOf(s.value)
    const next = i < N - 1 ? wOf(stages[i + 1].value) : wTop * 0.78
    if (shape === 'funnel') {
      const d = `M${cx - wTop / 2} ${y}L${cx + wTop / 2} ${y}L${cx + next / 2} ${y + rowH}L${cx - next / 2} ${y + rowH}Z`
      nodes.push(pathNode(ctx, d, `stage[${i}]`, { fill: col }))
    } else {
      nodes.push(solidRect({ x: sx, y, width: wTop, height: rowH }, col, `stage[${i}]`, 3))
    }
    // Name, right-aligned against the shape column.
    const nm = textAligned(ctx, s.label, ns, { x: 0, y: y + (rowH - lh) / 2, width: labelW }, 'end', `stage[${i}].label`)
    nodes.push(...nm.nodes.slice(0, 1))
    // Value: inside the shape if it fits (use the narrow edge), otherwise just outside.
    const txt = fmtNum(s.value, props.format)
    const tw = ctx.measureText(txt, vs).width * TEXT_SLACK
    const narrow = shape === 'funnel' ? Math.min(wTop, next) : wTop
    if (tw + 8 <= narrow && rowH >= lh) {
      const ink = readableOn(onColor(ctx, col), col)
      const vx = shape === 'funnel' ? cx : sx + wTop / 2
      nodes.push(...textAligned(ctx, txt, { ...vs, color: ink }, { x: vx - tw / 2, y: y + (rowH - lh) / 2, width: tw }, 'center', `stage[${i}].value`).nodes.slice(0, 1))
    } else {
      const edge = shape === 'funnel' ? cx + wTop / 2 : sx + wTop
      const vx = Math.min(edge + 6, Math.max(0, W - tw - (dropW ? dropW + gap : 0)))
      nodes.push(...textAligned(ctx, txt, vs, { x: vx, y: y + (rowH - lh) / 2, width: tw }, 'start', `stage[${i}].value`).nodes.slice(0, 1))
    }
    if (dropoff && dropTexts[i]) {
      const by = y - rowGap / 2
      nodes.push(...textAligned(ctx, dropTexts[i], ds, { x: W - dropW, y: by - lineH(ds) / 2, width: dropW }, 'end', `dropoff[${i}]`).nodes.slice(0, 1))
    }
  })
  return root(ctx, nodes)
}

export function capacity(props: FunnelChartProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ stages: { max: FUNNEL_MAX_STAGES, used: asArr(props.stages).length } }, true, [{ kind: 'truncate', slot: 'stages' }])
}
