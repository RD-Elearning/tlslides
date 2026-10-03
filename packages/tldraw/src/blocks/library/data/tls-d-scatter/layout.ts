/**
 * Pure layout for tls.d.scatter — points on two nice numeric axes.
 *
 * Colour: one accent for ungrouped data, the categorical ramp per group (legend on top). With a
 * highlight, that point is accent-coloured and labelled and the rest are dimmed. Labels never
 * overlap each other: a label that would collide is skipped, never stacked.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { ScatterProps } from './schema'
import { SCATTER_MAX_POINTS } from './schema'
import { layoutLegend } from '../_engine/legend'
import {
  asArr, capacityOf, chartColors, clamp, dimmed, dot, emptyState, enumOf, fmtNum, isNum, lineH, mutedStyle, niceAxis, numOrNull, oneLine, pathNode,
  root, seriesColors, solidRect, str, textAligned, TEXT_SLACK, valueAxisLeft,
} from '../_chart/kit'

interface Pt {
  x: number
  y: number
  label: string
  group: string
  idx: number
}

export function layout(props: ScatterProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const pts: Pt[] = []
  asArr<Record<string, unknown>>(props.points)
    .slice(0, SCATTER_MAX_POINTS)
    .forEach((p, idx) => {
      const x = numOrNull(p?.x)
      const y = numOrNull(p?.y)
      if (x !== null && y !== null) pts.push({ x, y, label: str(p.label), group: str(p.group), idx })
    })
  if (pts.length === 0) return emptyState(ctx)

  const c = chartColors(ctx)
  const nodes: LayoutNode[] = []
  const anyGroup = pts.some((p) => p.group)
  const groupNames = anyGroup ? Array.from(new Set(pts.map((p) => p.group || 'Other'))) : []
  const colors = seriesColors(ctx, Math.max(1, groupNames.length))
  const hl = isNum(props.highlightIndex) && props.highlightIndex >= 0 && pts.some((p) => p.idx === props.highlightIndex) ? props.highlightIndex : -1
  const colorOf = (p: Pt) => {
    const base = groupNames.length > 1 ? colors[groupNames.indexOf(p.group || 'Other')] : colors[0]
    if (hl < 0) return base
    return p.idx === hl ? c.accent : dimmed(c, base)
  }

  let area = { x: 0, y: 0, width: W, height: H }
  const placement = enumOf(props.legend, ['top', 'bottom', 'right', 'none'] as const, 'top')
  if (groupNames.length > 1 && placement !== 'none') {
    const lg = layoutLegend(groupNames.map((g, i) => ({ label: g, color: colors[i] })), area, ctx, placement)
    nodes.push(...lg.nodes)
    area = lg.plotBox
  }

  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const ax = niceAxis(Math.min(...xs), Math.max(...xs), 5)
  const ay = niceAxis(Math.min(...ys), Math.max(...ys), 5)
  const ls = mutedStyle(ctx, 'footnote')
  const lh = lineH(ls)
  const gridlines = props.gridlines !== 'none'
  const top = lh / 2 + 4
  const xAxisH = lh * 1.5 + 8
  const yaxis = valueAxisLeft(ctx, { x: area.x, y: area.y + top, width: area.width, height: Math.max(0, area.height - top - xAxisH) }, ay, { format: props.format, gridlines, rightPad: 16, c })
  nodes.push(...yaxis.nodes)
  const plot = yaxis.plot
  const xspan = ax.max - ax.min || 1
  const px = (v: number) => plot.x + plot.width * clamp((v - ax.min) / xspan, 0, 1)
  const py = yaxis.y

  // X tick labels (every n-th when they would crowd).
  const xt = ax.ticks.map((t) => fmtNum(t, props.format))
  const maxW = Math.max(...xt.map((t) => ctx.measureText(t, ls).width)) * TEXT_SLACK
  const spacing = ax.ticks.length > 1 ? plot.width / (ax.ticks.length - 1) : plot.width
  const stride = Math.max(1, Math.ceil((maxW + 8) / Math.max(1, spacing)))
  ax.ticks.forEach((t, i) => {
    if (i % stride !== 0) return
    const tw = ctx.measureText(xt[i], ls).width * 1.12
    const x = clamp(px(t) - tw / 2, 0, Math.max(0, W - tw))
    nodes.push(...textAligned(ctx, xt[i], ls, { x, y: plot.y + plot.height + lh / 2 + 6, width: tw }, 'start', `xtick[${i}]`).nodes.slice(0, 1))
  })

  // Quadrant lines at the middle of each axis.
  if (props.quadrants === true) {
    const mx = px((ax.min + ax.max) / 2)
    const my = py((ay.min + ay.max) / 2)
    nodes.push(solidRect({ x: mx - 1, y: plot.y, width: 2, height: plot.height }, c.line, 'quadrant.x'))
    nodes.push(solidRect({ x: plot.x, y: my - 1, width: plot.width, height: 2 }, c.line, 'quadrant.y'))
  }

  // Least-squares trend line.
  if (props.trendline === true && pts.length >= 2) {
    const n = pts.length
    const mxv = xs.reduce((a, b) => a + b, 0) / n
    const myv = ys.reduce((a, b) => a + b, 0) / n
    const sxx = xs.reduce((a, x) => a + (x - mxv) ** 2, 0)
    if (sxx > 0) {
      const b = pts.reduce((a, p) => a + (p.x - mxv) * (p.y - myv), 0) / sxx
      const a = myv - b * mxv
      const x0 = Math.min(...xs)
      const x1 = Math.max(...xs)
      nodes.push(pathNode(ctx, `M${px(x0)} ${py(a + b * x0)}L${px(x1)} ${py(a + b * x1)}`, 'trend', { stroke: c.muted, strokeWidth: 3 }))
    }
  }

  // Points.
  const r = pts.length <= 20 ? 8 : pts.length <= 40 ? 6 : 5
  pts.forEach((p) => nodes.push(dot(px(p.x), py(p.y), r, colorOf(p), `point[${p.idx}]`, c.surface)))

  // Labels.
  const mode = enumOf(props.labelPoints, ['none', 'highlighted', 'all'] as const, 'none')
  const placed: Array<{ x: number; y: number; w: number; h: number }> = []
  const labelStyle = { ...ls, color: c.text }
  const order = pts.slice().sort((a, b) => (a.idx === hl ? -1 : b.idx === hl ? 1 : 0))
  for (const p of order) {
    const show = mode === 'all' || (mode === 'highlighted' && p.idx === hl) || p.idx === hl
    if (!show || !p.label) continue
    const w = Math.min(plot.width * 0.4, ctx.measureText(p.label, labelStyle).width * 1.12 + 2)
    const cx = px(p.x)
    const cy = py(p.y)
    const right = cx + r + 4 + w <= W
    const x = right ? cx + r + 4 : cx - r - 4 - w
    const y = cy - lh / 2
    const box = { x, y, w, h: lh }
    if (x < 0 || placed.some((b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)) continue
    placed.push(box)
    nodes.push(oneLine(ctx, p.label, labelStyle, { x, y, width: w }, `label[${p.idx}]`))
  }
  return root(ctx, nodes)
}

export function capacity(props: ScatterProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf({ points: { max: SCATTER_MAX_POINTS, used: asArr(props.points).length } }, true, [{ kind: 'truncate', slot: 'points' }])
}
