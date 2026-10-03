/**
 * Shared layout for `tls.d.grouped-bar` and `tls.d.stacked-bar`: categories on a band axis, one
 * colour per series, vertical columns or horizontal bars, zero baseline.
 *
 * - grouped: one bar per series inside each category band.
 * - stacked: segments add up; positives stack up and negatives down separately.
 * - percent (stacked + `normalize`): each category is scaled to 100%; negatives count as 0.
 *
 * Value labels are all-or-nothing for grouped bars (a chart where only some labels fit looks
 * broken); stacked segments are labelled one by one when they are big enough.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box, LayoutContext, LayoutNode } from '../../../types'
import { bandScale, multiSeriesDomain } from '../_engine/multi-series'
import { layoutLegend } from '../_engine/legend'
import type { LegendPlacement } from '../_engine/legend'
import {
  AXIS_W, GRID_W, categoryLabels, chartColors, clamp, clipLines, dimmed, emptyState, enumOf, fmtNum, isNum, lineH, mutedStyle, niceAxis, noData,
  onColor, readCategories, readSeries, root, seriesColors, solidRect, textAligned, TEXT_SLACK, valueAxisLeft,
} from './kit'
import type { Series } from './kit'

export type BarKind = 'grouped' | 'stacked'

export interface BarFamilyProps extends Record<string, unknown> {
  categories?: string[]
  series?: Array<{ name: string; values: Array<number | null> }>
  orientation?: 'vertical' | 'horizontal'
  groupGap?: 'md' | 'sm' | 'lg'
  legend?: LegendPlacement
  valueLabels?: 'none' | 'end' | 'inside'
  gridlines?: 'major' | 'none'
  format?: string
  highlightIndex?: number
  normalize?: boolean
  totals?: boolean
}

export const BAR_MAX_CATEGORIES = 12
export const GROUPED_MAX_SERIES = 4
export const STACKED_MAX_SERIES = 6
const GAP = { sm: 0.18, md: 0.34, lg: 0.5 } as const

interface Seg {
  s: number
  c: number
  from: number
  to: number
  /** The value as the reader should see it (raw, or the percent share). */
  shown: number
}

export function barFamilyLayout(kind: BarKind, props: BarFamilyProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const cats = readCategories(props.categories).slice(0, BAR_MAX_CATEGORIES)
  const N = cats.length
  const maxSeries = kind === 'grouped' ? GROUPED_MAX_SERIES : STACKED_MAX_SERIES
  const series: Series[] = readSeries(props.series, N).slice(0, maxSeries)
  const S = series.length
  if (N < 1 || S === 0 || noData(series)) return emptyState(ctx)

  const mode: 'grouped' | 'stacked' | 'percent' = kind === 'grouped' ? 'grouped' : props.normalize ? 'percent' : 'stacked'
  const horizontal = props.orientation === 'horizontal'
  const c = chartColors(ctx)
  const colors = seriesColors(ctx, S)
  const fmt = mode === 'percent' ? 'percent' : props.format
  const hl = isNum(props.highlightIndex) && props.highlightIndex >= 0 && props.highlightIndex < N ? props.highlightIndex : -1
  const colorOf = (s: number, cat: number) => (hl >= 0 && cat !== hl ? dimmed(c, colors[s]) : colors[s])
  const gap = GAP[enumOf(props.groupGap, ['md', 'sm', 'lg'] as const, 'md')]
  const nodes: LayoutNode[] = []

  // Legend (a single series is named by the chart itself, never by a legend).
  let area: Box = { x: 0, y: 0, width: W, height: H }
  const placement = enumOf(props.legend, ['top', 'bottom', 'right', 'none'] as const, 'top')
  if (S > 1 && placement !== 'none') {
    const lg = layoutLegend(series.map((s, i) => ({ label: s.name || `Series ${i + 1}`, color: colors[i] })), area, ctx, placement)
    nodes.push(...lg.nodes)
    area = lg.plotBox
  }

  // Marks in value space.
  const segs: Seg[] = []
  const totalsByCat = cats.map((_, i) => series.reduce((t, sr) => t + Math.max(0, isNum(sr.values[i]) ? (sr.values[i] as number) : 0), 0))
  const rawTotals = totalsByCat.slice()
  if (mode === 'grouped') {
    series.forEach((sr, s) => cats.forEach((_, i) => isNum(sr.values[i]) && segs.push({ s, c: i, from: 0, to: sr.values[i] as number, shown: sr.values[i] as number })))
  } else {
    const pos = new Array<number>(N).fill(0)
    const neg = new Array<number>(N).fill(0)
    series.forEach((sr, s) =>
      cats.forEach((_, i) => {
        const raw = sr.values[i]
        if (!isNum(raw)) return
        if (mode === 'percent') {
          const share = totalsByCat[i] > 0 ? (Math.max(0, raw) / totalsByCat[i]) * 100 : 0
          if (share > 0) segs.push({ s, c: i, from: pos[i], to: pos[i] + share, shown: share })
          pos[i] += share
        } else if (raw >= 0) {
          segs.push({ s, c: i, from: pos[i], to: pos[i] + raw, shown: raw })
          pos[i] += raw
        } else {
          segs.push({ s, c: i, from: neg[i], to: neg[i] + raw, shown: raw })
          neg[i] += raw
        }
      })
    )
  }

  const [lo, hi] = mode === 'percent' ? ([0, 100] as [number, number]) : multiSeriesDomain(series, mode)
  const axis = niceAxis(lo, hi, 5)
  const span = axis.max - axis.min || 1
  const ls = mutedStyle(ctx, 'footnote')
  const lh = lineH(ls)
  const labelStyle = mutedStyle(ctx, 'footnote')
  const showTotals = kind === 'stacked' && (props.totals === true || props.valueLabels === 'end') && mode !== 'grouped'
  const vlMode = enumOf(props.valueLabels, ['none', 'end', 'inside'] as const, 'none')
  const gridlines = props.gridlines !== 'none'
  const labelOf = (seg: Seg) => (mode === 'percent' ? `${Math.round(seg.shown)}%` : fmtNum(seg.shown, fmt))
  const labelW = (txt: string) => ctx.measureText(txt, ls).width * TEXT_SLACK

  const place = (t: ReturnType<typeof textAligned>) => nodes.push(...t.nodes)

  if (!horizontal) {
    const topPad = lh / 2 + 2 + (showTotals ? lh + 4 : 0) + (mode === 'grouped' && vlMode === 'end' ? lh + 4 : 0)
    const base = { x: area.x, y: area.y + topPad, width: area.width, height: Math.max(0, area.height - topPad) }
    const probe = valueAxisLeft(ctx, { ...base, height: 100 }, axis, { format: fmt, gridlines, rightPad: 4, c })
    const bands = bandScale(cats, [probe.plot.x, probe.plot.x + probe.plot.width], gap)
    const centers = cats.map((_, i) => probe.plot.x + bands.step * i + bands.step / 2)
    const lab0 = categoryLabels(ctx, cats, centers, bands.step, 0, (i) => `cat[${i}]`)
    const gapX = lab0.height > 0 ? lh / 2 + 6 : 0
    const ax = valueAxisLeft(ctx, { ...base, height: Math.max(0, base.height - lab0.height - gapX) }, axis, { format: fmt, gridlines, rightPad: 4, c })
    nodes.push(...ax.nodes)
    nodes.push(...categoryLabels(ctx, cats, centers, bands.step, ax.plot.y + ax.plot.height + gapX, (i) => `cat[${i}]`).nodes)

    const inner = mode === 'grouped' ? Math.min(4, bands.bandwidth * 0.08) : 0
    const barW = mode === 'grouped' ? Math.max(1, (bands.bandwidth - inner * (S - 1)) / S) : bands.bandwidth
    const xOf = (s: number, ci: number) => bands.start(ci) + (mode === 'grouped' ? s * (barW + inner) : 0)
    const labelsFit = segs.every((sg) => labelW(labelOf(sg)) <= barW + inner)
    for (const sg of segs) {
      const yA = ax.y(sg.from)
      const yB = ax.y(sg.to)
      const y = Math.min(yA, yB)
      const h = Math.abs(yA - yB)
      if (h <= 0.01) continue
      const part = mode === 'grouped' ? `bar[${sg.s}][${sg.c}]` : `seg[${sg.s}][${sg.c}]`
      const x = xOf(sg.s, sg.c)
      nodes.push({
        k: 'rect',
        part,
        box: { x, y, width: barW, height: h },
        fill: { type: 'solid', color: colorOf(sg.s, sg.c) },
        ...(mode !== 'grouped' ? { stroke: { color: c.surface, width: 1 } } : {}),
      })
      const txt = labelOf(sg)
      const tw = labelW(txt)
      if (mode === 'grouped' && vlMode !== 'none' && labelsFit) {
        const inside = vlMode === 'inside' && h >= lh + 4
        const ly = inside ? (sg.to >= 0 ? y + 2 : y + h - lh - 2) : sg.to >= 0 ? y - lh - 2 : y + h + 2
        const st = { ...ls, color: inside ? onColor(ctx, colorOf(sg.s, sg.c)) : c.text }
        place(textAligned(ctx, txt, st, { x: x + barW / 2 - Math.max(tw, barW) / 2, y: ly, width: Math.max(tw, barW) }, 'center', `${part}.value`))
      } else if (mode !== 'grouped' && vlMode === 'inside' && h >= lh + 2 && tw <= barW - 4) {
        place(textAligned(ctx, txt, { ...ls, color: onColor(ctx, colorOf(sg.s, sg.c)) }, { x, y: y + (h - lh) / 2, width: barW }, 'center', `${part}.value`))
      }
    }
    if (showTotals) {
      cats.forEach((_, i) => {
        const total = mode === 'percent' ? rawTotals[i] : segs.filter((sg) => sg.c === i && sg.to >= sg.from).reduce((t, sg) => Math.max(t, sg.to), 0)
        const txt = fmtNum(mode === 'percent' ? rawTotals[i] : total, props.format)
        const tw = labelW(txt)
        if (tw > bands.step * 0.98) return
        const top = mode === 'percent' ? ax.y(100) : ax.y(total)
        place(textAligned(ctx, txt, { ...ls, color: c.text }, { x: centers[i] - tw / 2, y: top - lh - 2, width: tw }, 'center', `total[${i}]`))
      })
    }
  } else {
    // Horizontal: category labels on the left, value axis along the bottom.
    const words = cats.map((t) => ctx.measureText(t, labelStyle).width)
    const catW = clamp(Math.ceil(Math.max(...words) * TEXT_SLACK), 20, W * 0.34)
    const valueTexts = segs.map(labelOf)
    const endRoom = (vlMode === 'end' && mode === 'grouped') || showTotals ? Math.ceil(Math.max(0, ...valueTexts.map((t) => labelW(t))) + 8) : 0
    const rightPad = Math.max(endRoom, labelW(fmtNum(axis.max, fmt)) / 2 + 2)
    const bottomH = lh + 8
    const plot: Box = {
      x: area.x + catW + 10,
      y: area.y + 2,
      width: Math.max(0, area.width - catW - 10 - rightPad),
      height: Math.max(0, area.height - bottomH - 2 - 6),
    }
    const xv = (v: number) => plot.x + plot.width * (clamp((v - axis.min) / span, 0, 1))
    axis.ticks.forEach((t, i) => {
      const x = xv(t)
      const isBase = Math.abs(t - Math.max(axis.min, Math.min(0, axis.max))) < 1e-9
      if (gridlines || isBase) nodes.push(solidRect({ x: x - (isBase ? AXIS_W : GRID_W) / 2, y: plot.y, width: isBase ? AXIS_W : GRID_W, height: plot.height }, isBase ? c.line : c.grid, `grid[${i}]`))
      const txt = fmtNum(t, fmt)
      const tw = labelW(txt)
      const tx = clamp(x - tw / 2, 0, Math.max(0, W - tw))
      place(textAligned(ctx, txt, ls, { x: tx, y: plot.y + plot.height + 6, width: tw }, 'center', `xtick[${i}]`))
    })
    const bands = bandScale(cats, [plot.y, plot.y + plot.height], gap)
    const inner = mode === 'grouped' ? Math.min(4, bands.bandwidth * 0.08) : 0
    const barH = mode === 'grouped' ? Math.max(1, (bands.bandwidth - inner * (S - 1)) / S) : bands.bandwidth
    cats.forEach((cat, i) => {
      const m = ctx.measureText(cat, labelStyle, Math.max(1, catW))
      const room = Math.max(1, Math.floor(bands.step / lh))
      const lines = clipLines(m.lines, room)
      const h = lines.length * lh
      const y = bands.start(i) + bands.bandwidth / 2 - h / 2
      const t = textAligned(ctx, lines.map((l) => l.text).join(' '), labelStyle, { x: area.x, y, width: catW }, 'end', `cat[${i}]`)
      nodes.push(...t.nodes.slice(0, lines.length))
    })
    for (const sg of segs) {
      const xA = xv(sg.from)
      const xB = xv(sg.to)
      const x = Math.min(xA, xB)
      const w = Math.abs(xA - xB)
      if (w <= 0.01) continue
      const y = bands.start(sg.c) + (mode === 'grouped' ? sg.s * (barH + inner) : 0)
      const part = mode === 'grouped' ? `bar[${sg.s}][${sg.c}]` : `seg[${sg.s}][${sg.c}]`
      nodes.push({
        k: 'rect',
        part,
        box: { x, y, width: w, height: barH },
        fill: { type: 'solid', color: colorOf(sg.s, sg.c) },
        ...(mode !== 'grouped' ? { stroke: { color: c.surface, width: 1 } } : {}),
      })
      const txt = labelOf(sg)
      const tw = labelW(txt)
      if (mode === 'grouped' && vlMode !== 'none' && barH >= lh) {
        const inside = vlMode === 'inside' && w >= tw + 8
        const lx = inside ? (sg.to >= 0 ? x + w - tw - 4 : x + 4) : sg.to >= 0 ? x + w + 4 : x - tw - 4
        place(textAligned(ctx, txt, { ...ls, color: inside ? onColor(ctx, colorOf(sg.s, sg.c)) : c.text }, { x: clamp(lx, 0, Math.max(0, W - tw)), y: y + (barH - lh) / 2, width: tw }, 'start', `${part}.value`))
      } else if (mode !== 'grouped' && vlMode === 'inside' && w >= tw + 8 && barH >= lh) {
        place(textAligned(ctx, txt, { ...ls, color: onColor(ctx, colorOf(sg.s, sg.c)) }, { x, y: y + (barH - lh) / 2, width: w }, 'center', `${part}.value`))
      }
    }
    if (showTotals) {
      cats.forEach((_, i) => {
        const total = mode === 'percent' ? rawTotals[i] : segs.filter((sg) => sg.c === i && sg.to >= sg.from).reduce((t, sg) => Math.max(t, sg.to), 0)
        const txt = fmtNum(total, props.format)
        const tw = labelW(txt)
        const x = (mode === 'percent' ? xv(100) : xv(total)) + 6
        place(textAligned(ctx, txt, { ...ls, color: c.text }, { x: Math.min(x, Math.max(0, W - tw)), y: bands.start(i) + bands.bandwidth / 2 - lh / 2, width: tw }, 'start', `total[${i}]`))
      })
    }
  }
  return root(ctx, nodes)
}
