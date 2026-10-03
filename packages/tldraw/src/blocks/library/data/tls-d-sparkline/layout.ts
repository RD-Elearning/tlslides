/**
 * Pure layout for tls.d.sparkline — [label] [axis-free line] [last figure] in one strip.
 *
 * No axes, no gridlines: a sparkline shows shape, not values. Non-numeric values break the line.
 * The y range is the data range (a flat series is drawn as a mid-height line).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { SparklineProps } from './schema'
import { SPARK_MAX_VALUES } from './schema'
import { areaPath, linePath } from '../_engine/line-path'
import type { Point } from '../_engine/line-path'
import {
  asArr, capacityOf, chartColors, dot, emptyState, fmtNum, fmtSigned, isNum, lineH, mutedStyle, numOrNull, oneLine, pathNode, root, str, style, textAligned,
  tintOf, TEXT_SLACK, readableOn,
} from '../_chart/kit'

export function layout(props: SparklineProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const values = asArr<unknown>(props.values).slice(0, SPARK_MAX_VALUES).map(numOrNull)
  const finite = values.filter(isNum)
  if (finite.length < 2) return emptyState(ctx)

  const c = chartColors(ctx)
  const sp = ctx.tokens.space
  const label = str(props.label)
  const showLast = props.showLast === 'delta' || props.showLast === 'none' ? props.showLast : 'value'
  const nodes: LayoutNode[] = []
  const gap = sp.xs

  // Text columns.
  const ts = style(ctx, 'caption', c.text)
  const ls = mutedStyle(ctx, 'caption')
  const first = finite[0]
  const last = finite[finite.length - 1]
  const delta = last - first
  const lastText = showLast === 'none' ? '' : showLast === 'delta' ? fmtSigned(delta, props.format) : fmtNum(last, props.format)
  const lastW = lastText ? Math.min(W * 0.3, Math.ceil(ctx.measureText(lastText, ts).width * TEXT_SLACK) + 2) : 0
  const labelW = label ? Math.min(W * 0.32, Math.ceil(ctx.measureText(label, ls).width * TEXT_SLACK) + 2) : 0
  const x0 = labelW ? labelW + gap : 0
  const x1 = Math.max(x0 + 8, W - (lastW ? lastW + gap : 0))

  const midY = (hh: number) => (H - hh) / 2
  if (label) {
    nodes.push(oneLine(ctx, label, ls, { x: 0, y: midY(lineH(ls)), width: labelW }, 'label'))
  }
  if (lastText) {
    const color = showLast === 'delta' && delta !== 0 ? readableOn(ctx.resolveColor(delta > 0 ? 'positive' : 'negative').color, c.surface) : c.text
    const t = textAligned(ctx, lastText, { ...ts, color }, { x: W - lastW, y: midY(lineH(ts)), width: lastW }, 'end', 'last')
    nodes.push(...t.nodes.slice(0, 1))
  }

  // The line.
  const pad = 8
  const top = pad
  const bottom = Math.max(top + 1, H - pad)
  const lo = Math.min(...finite)
  const hi = Math.max(...finite)
  const span = hi - lo
  const y = (v: number) => (span === 0 ? (top + bottom) / 2 : bottom - ((v - lo) / span) * (bottom - top))
  const step = (x1 - x0 - 2 * 6) / Math.max(1, values.length - 1)
  const xAt = (i: number) => x0 + 6 + i * step
  const segs: Point[][] = []
  let cur: Point[] = []
  values.forEach((v, i) => {
    if (isNum(v)) cur.push({ x: xAt(i), y: y(v) })
    else if (cur.length) {
      segs.push(cur)
      cur = []
    }
  })
  if (cur.length) segs.push(cur)
  const fillColor = tintOf(c.surface, c.accent, 0.18)
  segs.forEach((pts, k) => {
    if (pts.length < 2) return
    if (props.fill === true) {
      const base = pts.map((p) => ({ x: p.x, y: bottom }))
      nodes.push(pathNode(ctx, areaPath(pts, base), k === 0 ? 'fill' : `fill.seg[${k}]`, { fill: fillColor }))
    }
  })
  segs.forEach((pts, k) => {
    if (pts.length >= 2) nodes.push(pathNode(ctx, linePath(pts), k === 0 ? 'line' : `line.seg[${k}]`, { stroke: c.accent, strokeWidth: 4 }))
  })
  if (props.endDot !== false) {
    const lastIdx = values.map(isNum).lastIndexOf(true)
    nodes.push(dot(xAt(lastIdx), y(values[lastIdx] as number), 6, c.accent, 'dot'))
  }
  return root(ctx, nodes)
}

export function capacity(props: SparklineProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf({ values: { max: SPARK_MAX_VALUES, used: asArr(props.values).length } }, true, [{ kind: 'truncate', slot: 'values' }])
}
