/**
 * Shared layout for `tls.d.line` and `tls.d.area`: ordered categories on x, a nice value axis on
 * y, one series per colour, direct end labels (line) or a legend (area / many series).
 *
 * Plot geometry: the left column is sized from the measured tick labels, the right margin from the
 * measured end labels, the bottom strip from the wrapped (or thinned) category labels.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import { areaPath, linePath } from '../_engine/line-path'
import type { CurveKind, Point } from '../_engine/line-path'
import { bandScale, multiSeriesDomain } from '../_engine/multi-series'
import { directLabel } from '../_engine/direct-label'
import { layoutLegend } from '../_engine/legend'
import type { LegendPlacement } from '../_engine/legend'
import {
  categoryLabels, chartColors, clipLines, dimmed, dot, emptyState, enumOf, faded, fmtNum, isNum, lineH, mutedStyle,
  niceAxis, noData, pathNode, readCategories, readSeries, readableOn, root, seriesColors, TEXT_SLACK, valueAxisLeft,
} from './kit'
import type { Series } from './kit'

export type LineKind = 'line' | 'area'

export interface LineFamilyProps extends Record<string, unknown> {
  categories?: string[]
  series?: Array<{ name: string; values: Array<number | null> }>
  format?: string
  legend?: LegendPlacement
  gridlines?: 'major' | 'none'
  curve?: CurveKind
  highlightIndex?: number
  // line
  markers?: 'none' | 'last' | 'all'
  endLabels?: boolean
  baseline?: 'auto' | 'zero'
  valueLabels?: 'none' | 'end'
  // area
  mode?: 'overlap' | 'stacked' | 'percent'
  opacity?: 'soft' | 'solid'
}

export const LINE_MAX_CATEGORIES = 24
export const LINE_MAX_SERIES = 6
const LINE_W = 5
const DOT_R = 7

export function lineFamilyLayout(kind: LineKind, props: LineFamilyProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const cats = readCategories(props.categories).slice(0, LINE_MAX_CATEGORIES)
  const N = cats.length
  const series = readSeries(props.series, N)
  if (N < 2 || series.length === 0 || noData(series)) return emptyState(ctx)

  const c = chartColors(ctx)
  const colors = seriesColors(ctx, series.length)
  const single = series.length === 1
  const curve = enumOf(props.curve, ['linear', 'monotone'] as const, 'linear')
  const mode = kind === 'area' ? enumOf(props.mode, ['overlap', 'stacked', 'percent'] as const, 'overlap') : 'overlap'
  const hl = isNum(props.highlightIndex) && props.highlightIndex >= 0 && props.highlightIndex < series.length ? props.highlightIndex : -1
  const colorOf = (s: number) => (hl >= 0 && s !== hl ? dimmed(c, colors[s]) : colors[s])
  const fmt = mode === 'percent' ? 'percent' : props.format
  const nodes: LayoutNode[] = []

  // Direct labels replace the legend on a line chart; a legend serves everything else.
  const endLabels = kind === 'line' && props.endLabels !== false && series.some((s) => s.name)
  const legendWanted = !single && !endLabels
  const placement = enumOf(props.legend, ['top', 'bottom', 'right', 'none'] as const, 'top')
  let area = { x: 0, y: 0, width: W, height: H }
  if (legendWanted && placement !== 'none') {
    const lg = layoutLegend(
      series.map((s, i) => ({ label: s.name || `Series ${i + 1}`, color: colors[i] })),
      area,
      ctx,
      placement
    )
    nodes.push(...lg.nodes)
    area = lg.plotBox
  }

  // End-label column.
  const ls = mutedStyle(ctx, 'footnote')
  const labelText = (s: Series) => {
    const last = lastIndex(s.values)
    const v = last >= 0 ? (s.values[last] as number) : null
    return props.valueLabels === 'end' && v !== null ? `${s.name} ${fmtNum(v, fmt)}`.trim() : s.name
  }
  let labelW = 0
  if (endLabels) {
    const widest = Math.max(...series.map((s) => ctx.measureText(labelText(s), ls).width))
    labelW = Math.min(W * 0.24, Math.ceil(widest * TEXT_SLACK) + 2)
  }

  // Domain & axis.
  let lo: number
  let hi: number
  if (kind === 'area' && mode === 'percent') [lo, hi] = [0, 100]
  else if (kind === 'area') [lo, hi] = multiSeriesDomain(series, mode === 'stacked' ? 'stacked' : 'grouped')
  else {
    const all = series.flatMap((s) => s.values).filter(isNum)
    const dMin = Math.min(...all)
    const dMax = Math.max(...all)
    const zero = props.baseline === 'zero'
    const nearZero = dMin >= 0 && dMin < dMax * 0.4
    ;[lo, hi] = zero || nearZero ? [Math.min(0, dMin), Math.max(0, dMax)] : [dMin, dMax]
  }
  const axis = niceAxis(lo, hi, 5)

  const top = lineH(ls) / 2 + 2
  const gridlines = props.gridlines !== 'none'
  const rightPad = labelW > 0 ? labelW + 14 : 6
  const base = { x: area.x, y: area.y + top, width: area.width, height: Math.max(0, area.height - top) }
  // Pass 1: x geometry (heights do not move it).
  const probe = valueAxisLeft(ctx, { ...base, height: 100 }, axis, { format: fmt, gridlines, rightPad, c })
  const bands = bandScale(cats, [probe.plot.x, probe.plot.x + probe.plot.width], 0)
  const centers = cats.map((_, i) => bands.center(i))
  const lab0 = categoryLabels(ctx, cats, centers, bands.step, 0, (i) => `cat[${i}]`)
  const gapX = lab0.height > 0 ? lineH(ls) / 2 + 6 : 0
  // Pass 2: the real plot.
  const ax = valueAxisLeft(ctx, { ...base, height: Math.max(0, base.height - lab0.height - gapX) }, axis, { format: fmt, gridlines, rightPad, c })
  nodes.push(...ax.nodes)
  const xl = categoryLabels(ctx, cats, centers, bands.step, ax.plot.y + ax.plot.height + gapX, (i) => `cat[${i}]`)
  nodes.push(...xl.nodes)

  if (kind === 'line') {
    const order = series.map((_, i) => i).sort((a, b) => (a === hl ? 1 : 0) - (b === hl ? 1 : 0))
    for (const s of order) {
      const sr = series[s]
      const segs = segmentsOf(sr.values, centers, ax.y)
      segs.forEach((pts, k) => {
        const part = k === 0 ? `series[${s}]` : `series[${s}].seg[${k}]`
        if (pts.length >= 2) nodes.push(pathNode(ctx, linePath(pts, curve), part, { stroke: colorOf(s), strokeWidth: LINE_W }))
        else nodes.push(dot(pts[0].x, pts[0].y, DOT_R, colorOf(s), part, c.surface))
      })
      const markers = enumOf(props.markers, ['none', 'last', 'all'] as const, 'none')
      if (markers !== 'none') {
        const last = lastIndex(sr.values)
        sr.values.forEach((v, i) => {
          if (!isNum(v)) return
          if (markers === 'last' && i !== last) return
          nodes.push(dot(centers[i], ax.y(v), DOT_R, colorOf(s), `series[${s}].dot[${i}]`, c.surface))
        })
      }
    }
    if (endLabels) {
      const lh = lineH(ls)
      const entries = series.map((sr, s) => {
        const last = lastIndex(sr.values)
        const m = ctx.measureText(labelText(sr), ls, Math.max(1, labelW))
        const lines = clipLines(m.lines, 2)
        return { s, last, lines, h: lines.length * lh, y: last >= 0 ? ax.y(sr.values[last] as number) : ax.plot.y }
      })
      const maxH = Math.max(...entries.map((e) => e.h))
      const ys = directLabel(
        entries.map((e) => ({ y: e.y - e.h / 2 })),
        { x: 0, y: ax.plot.y - lh / 2, width: 1, height: ax.plot.height + lh },
        { labelHeight: maxH, gap: 2 }
      )
      entries.forEach((e, i) => {
        if (e.last < 0 || !labelText(series[e.s])) return
        const color = readableOn(colors[e.s], c.surface)
        nodes.push({
          k: 'text',
          part: `label[${e.s}]`,
          box: { x: ax.plot.x + ax.plot.width + 10, y: ys[i], width: Math.max(1, labelW), height: e.h },
          lines: e.lines,
          style: { ...ls, color: hl >= 0 && e.s !== hl ? c.muted : color },
        })
      })
    }
  } else {
    // Area: overlap (each series to the baseline), stacked, or percent-stacked.
    const base0 = ax.y(0)
    const tops: Point[][] = []
    const bottoms: Point[][] = []
    const cum = new Array<number>(N).fill(0)
    const totals = cats.map((_, i) => series.reduce((t, s) => t + Math.max(0, isNum(s.values[i]) ? (s.values[i] as number) : 0), 0))
    series.forEach((s) => {
      const t: Point[] = []
      const b: Point[] = []
      cats.forEach((_, i) => {
        const raw = isNum(s.values[i]) ? (s.values[i] as number) : 0
        if (mode === 'overlap') {
          t.push({ x: centers[i], y: ax.y(raw) })
          b.push({ x: centers[i], y: base0 })
        } else {
          const v = Math.max(0, raw)
          const share = mode === 'percent' ? (totals[i] > 0 ? (v / totals[i]) * 100 : 0) : v
          b.push({ x: centers[i], y: ax.y(cum[i]) })
          cum[i] += share
          t.push({ x: centers[i], y: ax.y(cum[i]) })
        }
      })
      tops.push(t)
      bottoms.push(b)
    })
    const soft = props.opacity !== 'solid' && mode === 'overlap'
    series.forEach((_, s) => {
      const fillNode = pathNode(ctx, areaPath(tops[s], bottoms[s], curve), `area[${s}]`, { fill: colorOf(s) })
      nodes.push(soft ? faded(ctx, 0.5, [fillNode]) : fillNode)
    })
    series.forEach((_, s) => {
      nodes.push(pathNode(ctx, linePath(tops[s], curve), `area[${s}].edge`, { stroke: colorOf(s), strokeWidth: mode === 'overlap' ? 4 : 2 }))
    })
  }
  return root(ctx, nodes)
}

function lastIndex(values: ReadonlyArray<number | null>): number {
  for (let i = values.length - 1; i >= 0; i--) if (isNum(values[i])) return i
  return -1
}

/** Runs of consecutive finite values as points; a null value breaks the line. */
function segmentsOf(values: ReadonlyArray<number | null>, xs: number[], y: (v: number) => number): Point[][] {
  const out: Point[][] = []
  let cur: Point[] = []
  values.forEach((v, i) => {
    if (isNum(v)) cur.push({ x: xs[i], y: y(v) })
    else if (cur.length > 0) {
      out.push(cur)
      cur = []
    }
  })
  if (cur.length > 0) out.push(cur)
  return out
}
