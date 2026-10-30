/**
 * The dot family (spro creative CR13): `tls.d.lollipop` (a stem and a dot) and `tls.d.dot-plot`
 * (a quiet track and a dot) — one value per row on a shared scale from zero, the label left, the
 * value after the dot. One highlighted row takes the accent; the others are tinted.
 *
 * Parts: `row[i].label`, `row[i].track` (dot-plot) / `row[i].stem` (lollipop), `row[i].dot`,
 * `row[i].value`. Pure and DOM-free.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import {
  asArr, capacityOf, chartColors, clamp, clipLines, dot, emptyState, enumOf, fmtNum, lineH, mutedStyle, numOrNull, root, solidRect, str, style, textAligned, tintOf, TEXT_SLACK,
} from './kit'
import { withNumberMetrics } from '../_table/kit'

export const DOT_MAX_ITEMS = 10
const MIN_ROW = 56
const MAX_ROW = 96

export interface DotItem {
  label: string
  value: number
}

export interface DotProps extends Record<string, unknown> {
  items: DotItem[]
  highlight?: string
  labels?: 'end' | 'none'
  sorted?: boolean
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

function read(props: DotProps): DotItem[] {
  const items = asArr<Record<string, unknown>>(props.items)
    .slice(0, DOT_MAX_ITEMS)
    .map((it) => ({ label: str(it?.label), value: numOrNull(it?.value) }))
    .filter((it): it is DotItem => it.value !== null)
  return props.sorted ? items.map((x, i) => ({ x, i })).sort((a, b) => b.x.value - a.x.value || a.i - b.i).map((e) => e.x) : items
}

export function dotLayout(props: DotProps, ctx0: LayoutContext, mode: 'lollipop' | 'dot-plot'): LayoutNode {
  const ctx = withNumberMetrics(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = read(props)
  if (items.length === 0) return emptyState(ctx)

  const c = chartColors(ctx)
  const sp = ctx.tokens.space
  const ls = style(ctx, 'body', c.text)
  const vs = style(ctx, 'body', c.text)
  const lh = lineH(ls)
  const n = items.length
  const rowH = clamp(H / n, MIN_ROW, MAX_ROW)
  const y0 = Math.max(0, (H - n * rowH) / 2)
  const showValue = enumOf(props.labels, ['end', 'none'] as const, 'end') === 'end'
  const valueTexts = items.map((it) => fmtNum(it.value, props.format, ctx.tokens.locale))
  const valueW = showValue ? Math.ceil(Math.max(...valueTexts.map((t) => ctx.measureText(t, vs).width)) * TEXT_SLACK) + 2 : 0
  const gap = sp.sm
  const labelW = Math.max(40, Math.min(W * 0.34, Math.ceil(Math.max(...items.map((it) => ctx.measureText(it.label, ls).width)) * TEXT_SLACK) + 2))
  const r = clamp(rowH * 0.2, 7, 14)
  const px = labelW + gap + r
  const pw = Math.max(0, W - px - r - (showValue ? valueW + gap : 0))
  const max = Math.max(...items.map((it) => it.value), 0)
  const hi = str(props.highlight).trim().toLowerCase()
  const nodes: LayoutNode[] = []

  items.forEach((it, i) => {
    const cy = y0 + i * rowH + rowH / 2
    const lead = hi ? it.label.trim().toLowerCase() === hi : it.value === max
    const fill = lead ? c.accent : tintOf(c.surface, c.accent, 0.62)
    const lm = ctx.measureText(it.label, ls, labelW)
    nodes.push({ k: 'text', part: `row[${i}].label`, box: { x: 0, y: cy - lh / 2, width: labelW, height: lh }, lines: clipLines(lm.lines, 1), style: ls })
    const cx = px + (max > 0 && it.value > 0 ? (pw * it.value) / max : 0)
    if (mode === 'dot-plot') {
      nodes.push(solidRect({ x: px, y: cy - 1.5, width: pw, height: 3 }, c.track, `row[${i}].track`, 1.5))
    } else {
      const sw = Math.max(0, cx - px)
      if (sw > 0) nodes.push(solidRect({ x: px, y: cy - 2, width: sw, height: 4 }, fill, `row[${i}].stem`, 2))
    }
    nodes.push(dot(cx, cy, r, fill, `row[${i}].dot`))
    if (showValue) nodes.push(...textAligned(ctx, valueTexts[i], { ...vs, color: lead ? c.text : mutedStyle(ctx, 'body').color }, { x: W - valueW, y: cy - lh / 2, width: valueW }, 'end', `row[${i}].value`).nodes.slice(0, 1))
  })
  return root(ctx, nodes)
}

export function dotCapacity(props: DotProps, box: Size): CapacityReport {
  const used = asArr(props.items).length
  const rows = Math.max(1, Math.floor(box.height / MIN_ROW))
  return capacityOf({ items: { max: Math.min(DOT_MAX_ITEMS, rows), used } }, used <= rows, [{ kind: 'truncate', slot: 'items' }, { kind: 'paginate' }])
}
