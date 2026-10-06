/**
 * Pure layout for tls.d.progress-bar — rows of label, track, fill and value.
 *
 * `labelPos: above` puts the label and value on one line over the track; `left` puts the label in
 * a column before the track and the value after it (shorter rows). Fill = value / max clamped to
 * [0, 1]; the value text always shows the unclamped number so 120% reads as 120%.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { ProgressBarProps } from './schema'
import { PROGRESS_MAX_ITEMS } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, clipLines, enumOf, fmtNum, lineH, numOrNull, root, solidRect,
  realWidth, str, style, textAligned,
} from '../_chart/kit'

const THICK = { sm: 10, md: 18, lg: 30 } as const

interface Row {
  label: string
  value: number
  max: number
  pct: number
}

function readRows(props: ProgressBarProps): Row[] {
  const rows: Row[] = []
  for (const it of asArr<Record<string, unknown>>(props.items)) {
    if (!it || typeof it !== 'object') continue
    const value = numOrNull(it.value) ?? 0
    const maxRaw = numOrNull(it.max)
    const max = maxRaw !== null && maxRaw > 0 ? maxRaw : 100
    rows.push({ label: str(it.label), value, max, pct: (value / max) * 100 })
    if (rows.length >= PROGRESS_MAX_ITEMS) break
  }
  return rows
}

function plan(props: ProgressBarProps, ctx: LayoutContext, width: number) {
  const rows = readRows(props)
  const thick = THICK[enumOf(props.thickness, ['md', 'sm', 'lg'] as const, 'md')]
  const labelPos = enumOf(props.labelPos, ['above', 'left'] as const, 'above')
  const ls = style(ctx, 'caption', ctx.resolveColor('text').color)
  const rowGap = ctx.tokens.space.sm
  const showValue = enumOf(props.showValue, ['percent', 'value', 'none'] as const, 'percent')
  const valueText = (r: Row) => (showValue === 'percent' ? `${Math.round(r.pct)}%` : showValue === 'value' ? fmtNum(r.value, props.format) : '')
  const valueW = showValue === 'none' ? 0 : Math.ceil(Math.max(0, ...rows.map((r) => realWidth(valueText(r), ls))) * 1.04) + 4
  const labelW =
    labelPos === 'left'
      ? Math.min(width * 0.35, Math.ceil(Math.max(0, ...rows.map((r) => realWidth(r.label, ls))) * 1.04))
      : 0
  const lh = lineH(ls)
  const rowH = labelPos === 'above' ? lh + ctx.tokens.space['2xs'] + thick : Math.max(lh, thick)
  const total = rows.length === 0 ? 0 : rows.length * rowH + (rows.length - 1) * rowGap
  return { rows, thick, labelPos, ls, rowGap, showValue, valueText, valueW, labelW, lh, rowH, total }
}

export function layout(props: ProgressBarProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const p = plan(props, ctx, W)
  const c = chartColors(ctx)
  const nodes: LayoutNode[] = []
  const gap = ctx.tokens.space.xs
  const showTrack = props.track !== false
  const accent = ctx.resolveColor('accent').color

  p.rows.forEach((r, i) => {
    const y = i * (p.rowH + p.rowGap)
    const frac = clamp(r.pct / 100, 0, 1)
    const color =
      props.tone === 'status'
        ? ctx.resolveColor(frac < 1 / 3 ? 'negative' : frac < 2 / 3 ? 'warning' : 'positive').color
        : accent
    let trackX = 0
    let trackW = W
    let trackY = y
    if (p.labelPos === 'above') {
      const lw = Math.max(1, W - p.valueW - (p.valueW ? gap : 0))
      const m = ctx.measureText(r.label, p.ls, lw)
      nodes.push({ k: 'text', part: `row[${i}].label`, box: { x: 0, y, width: lw, height: p.lh }, lines: clipLines(m.lines, 1), style: p.ls, propPath: `items.${i}.label` })
      if (p.valueW) nodes.push(...textAligned(ctx, p.valueText(r), p.ls, { x: W - p.valueW, y, width: p.valueW }, 'end', `row[${i}].value`).nodes)
      trackY = y + p.lh + ctx.tokens.space['2xs']
    } else {
      const lw = Math.max(1, p.labelW)
      const m = ctx.measureText(r.label, p.ls, lw)
      nodes.push({ k: 'text', part: `row[${i}].label`, box: { x: 0, y: y + (p.rowH - p.lh) / 2, width: lw, height: p.lh }, lines: clipLines(m.lines, 1), style: p.ls, propPath: `items.${i}.label` })
      trackX = p.labelW + gap
      trackW = Math.max(1, W - trackX - (p.valueW ? p.valueW + gap : 0))
      if (p.valueW) nodes.push(...textAligned(ctx, p.valueText(r), p.ls, { x: W - p.valueW, y: y + (p.rowH - p.lh) / 2, width: p.valueW }, 'end', `row[${i}].value`).nodes)
      trackY = y + (p.rowH - p.thick) / 2
    }
    if (showTrack) nodes.push(solidRect({ x: trackX, y: trackY, width: trackW, height: p.thick }, c.track, `row[${i}].track`, p.thick / 2))
    if (frac > 0) nodes.push(solidRect({ x: trackX, y: trackY, width: Math.max(p.thick, trackW * frac), height: p.thick }, color, `row[${i}].fill`, p.thick / 2))
  })
  const h = Math.max(ctx.box.height, 0)
  return { ...root(ctx, nodes), box: { x: 0, y: 0, width: W, height: h } }
}

export function capacity(props: ProgressBarProps, box: Size, ctx: LayoutContext): CapacityReport {
  const count = asArr(props.items).length
  const p = plan(props, ctx, Math.max(1, box.width))
  const fitsH = p.total <= box.height + 0.5
  const remedy: CapacityReport['remedy'] = []
  const r = capacityOf({ items: { max: PROGRESS_MAX_ITEMS, used: count } }, fitsH)
  if (!r.fits) {
    if (p.labelPos !== 'left') remedy.push({ kind: 'reflow', to: "labelPos: 'left'" })
    remedy.push({ kind: 'truncate', slot: 'items' })
  }
  r.budget.height = { max: Math.max(1, Math.floor(box.height)), used: Math.max(1, Math.ceil(p.total)), unit: 'items' }
  return { ...r, remedy: r.fits ? [] : remedy }
}
