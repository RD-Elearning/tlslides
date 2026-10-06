/**
 * Pure layout for tls.d.radar — a regular polygon grid with one shape per series.
 *
 * Axis 0 points straight up and the rest follow clockwise. Values are clamped to [0, max] (the
 * scale has no negative side); a missing value is 0. Axis labels sit outside the grid, anchored by
 * the side they are on, so they never cross the chart.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { RadarProps } from './schema'
import { RADAR_MAX_AXES, RADAR_MAX_SERIES } from './schema'
import { layoutLegend } from '../_engine/legend'
import {
  asArr, capacityOf, chartColors, clamp, dot, emptyState, enumOf, faded, fmtNum, isNum, lineH, mutedStyle, niceAxis, noData, numOrNull, oneLine, pathNode,
  readCategories, readSeries, root, seriesColors, style, realWidth,
  withRealWidths,
} from '../_chart/kit'

export function layout(props: RadarProps, ctx0: LayoutContext): LayoutNode {
  // Browser-true single-line widths for every label decision (RV05).
  const ctx = withRealWidths(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const axes = readCategories(props.axes).slice(0, RADAR_MAX_AXES)
  const A = axes.length
  const series = readSeries(props.series, A).slice(0, RADAR_MAX_SERIES)
  if (A < 3 || series.length === 0 || noData(series)) return emptyState(ctx)

  const c = chartColors(ctx)
  const colors = seriesColors(ctx, series.length)
  const nodes: LayoutNode[] = []
  const rings = Math.round(clamp(numOrNull(props.rings) ?? 4, 1, 8))
  const dataMax = Math.max(0, ...series.flatMap((s) => s.values.filter(isNum)))
  const givenMax = numOrNull(props.max)
  const max = givenMax !== null && givenMax > 0 ? givenMax : niceAxis(0, dataMax, rings).max

  let area = { x: 0, y: 0, width: W, height: H }
  const placement = enumOf(props.legend, ['top', 'bottom', 'right', 'none'] as const, 'top')
  if (series.length > 1 && placement !== 'none') {
    const lg = layoutLegend(series.map((s, i) => ({ label: s.name || `Series ${i + 1}`, color: colors[i] })), area, ctx, placement)
    nodes.push(...lg.nodes)
    area = lg.plotBox
  }

  const ls = style(ctx, 'caption', c.text)
  const lh = lineH(ls)
  const labelW = Math.min(area.width * 0.24, Math.ceil(Math.max(...axes.map((t) => realWidth(t, ls))) * 1.04) + 2)
  const R0 = Math.min((area.width - 2 * (labelW + 14)) / 2, (area.height - 2 * (lh + 10)) / 2)
  const R = R0 > 24 ? R0 : Math.max(12, Math.min(area.width, area.height) / 2 - 8)
  const cx = area.x + area.width / 2
  const cy = area.y + area.height / 2
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / A
  const at = (i: number, r: number) => ({ x: cx + r * Math.cos(ang(i)), y: cy + r * Math.sin(ang(i)) })
  const poly = (r: (i: number) => number) => axes.map((_, i) => at(i, r(i))).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join('') + 'Z'

  // Grid rings (outermost last so its stroke wins), spokes, ring values along axis 0.
  const gs = mutedStyle(ctx, 'footnote')
  for (let k = 1; k <= rings; k++) {
    const r = (R * k) / rings
    nodes.push(pathNode(ctx, poly(() => r), `grid[${k - 1}]`, { stroke: k === rings ? c.line : c.grid, strokeWidth: 2 }))
  }
  axes.forEach((_, i) => {
    const p = at(i, R)
    nodes.push(pathNode(ctx, `M${cx} ${cy}L${p.x} ${p.y}`, `spoke[${i}]`, { stroke: c.grid, strokeWidth: 2 }))
  })
  const roomy = R / rings >= lineH(gs) * 1.2
  for (let k = 1; k <= rings; k++) {
    if (!roomy && k !== rings) continue
    const r = (R * k) / rings
    const txt = fmtNum((max * k) / rings)
    nodes.push(oneLine(ctx, txt, gs, { x: cx + 6, y: cy - r + 2, width: Math.max(1, ctx.measureText(txt, gs).width * 1.2 + 2) }, `gridlabel[${k - 1}]`))
  }

  // Series.
  const value = (s: number, i: number) => clamp(series[s].values[i] ?? 0, 0, max)
  series.forEach((_, s) => {
    const d = poly((i) => (R * value(s, i)) / max)
    if (props.fill !== false) nodes.push(faded(ctx, 0.28, [pathNode(ctx, d, `series[${s}].area`, { fill: colors[s] })]))
    nodes.push(pathNode(ctx, d, `series[${s}]`, { stroke: colors[s], strokeWidth: 4 }))
    axes.forEach((_, i) => {
      const p = at(i, (R * value(s, i)) / max)
      nodes.push(dot(p.x, p.y, 6, colors[s], `series[${s}].dot[${i}]`, c.surface))
    })
  })

  // Axis labels outside the grid.
  axes.forEach((name, i) => {
    const p = at(i, R + 12)
    const cs = Math.cos(ang(i))
    const sn = Math.sin(ang(i))
    const w = Math.min(labelW, Math.ceil(realWidth(name, ls) * 1.04) + 2)
    const x = cs > 0.3 ? p.x : cs < -0.3 ? p.x - w : p.x - w / 2
    const y = p.y - lh / 2 + sn * (lh / 2)
    nodes.push(oneLine(ctx, name, ls, { x: clamp(x, 0, Math.max(0, W - w)), y: clamp(y, 0, Math.max(0, H - lh)), width: w }, `axis[${i}]`))
  })
  return root(ctx, nodes)
}

export function capacity(props: RadarProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf(
    { axes: { max: RADAR_MAX_AXES, used: asArr(props.axes).length }, series: { max: RADAR_MAX_SERIES, used: asArr(props.series).length } },
    true,
    [{ kind: 'truncate', slot: 'series' }]
  )
}
