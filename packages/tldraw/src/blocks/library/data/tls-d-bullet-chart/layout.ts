/**
 * Pure layout for tls.d.bullet-chart — one row per KPI: label, range bands, value bar, target tick.
 *
 * The scale runs 0..max (item `max`, else the data rounded up). Qualitative bands cover 0-60%,
 * 60-80% and 80-100% of the scale in three quiet greys, darkest first. The value bar is `accent`
 * and thinner than the bands; the target is a tall thin tick in the text colour. A value or target
 * past the scale is clamped to its end.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { BulletChartProps } from './schema'
import { BULLET_MAX_ITEMS } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, clipLines, emptyState, fmtNum, lineH, niceAxis, numOrNull, root, solidRect, str, style, textAligned, tintOf, TEXT_SLACK,
} from '../_chart/kit'

export function layout(props: BulletChartProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = asArr<Record<string, unknown>>(props.items)
    .slice(0, BULLET_MAX_ITEMS)
    .map((it) => ({ label: str(it?.label), value: numOrNull(it?.value), target: numOrNull(it?.target), max: numOrNull(it?.max) }))
    .filter((it) => it.value !== null || it.target !== null)
  if (items.length === 0) return emptyState(ctx)

  const c = chartColors(ctx)
  const ls = style(ctx, 'caption', c.text)
  const vs = style(ctx, 'caption', c.text)
  const lh = lineH(ls)
  const showBands = props.bands !== 'none'
  const sp = ctx.tokens.space
  const nodes: LayoutNode[] = []

  const labelW = Math.min(W * 0.28, Math.ceil(Math.max(...items.map((it) => ctx.measureText(it.label, ls).width)) * TEXT_SLACK) + 2)
  const valueTexts = items.map((it) => fmtNum(it.value ?? 0, props.format))
  const valueW = Math.ceil(Math.max(...valueTexts.map((t) => ctx.measureText(t, vs).width)) * TEXT_SLACK) + 2
  const gap = sp.xs
  const bx = labelW + gap
  const bw = Math.max(1, W - bx - valueW - gap)
  const rowGap = sp.sm
  const n = items.length
  const rowH = Math.min(84, Math.max(lh, (H - (n - 1) * rowGap) / n))
  const y0 = Math.max(0, (H - (n * rowH + (n - 1) * rowGap)) / 2)
  const bands = [tintOf(c.surface, c.line, 0.85), tintOf(c.surface, c.line, 0.55), tintOf(c.surface, c.line, 0.3)]

  items.forEach((it, i) => {
    const y = y0 + i * (rowH + rowGap)
    const value = Math.max(0, it.value ?? 0)
    const target = Math.max(0, it.target ?? 0)
    const max = it.max !== null && it.max > 0 ? it.max : niceAxis(0, Math.max(value, target) * 1.1, 4).max
    const xv = (v: number) => bx + bw * clamp(v / max, 0, 1)
    // Label.
    const m = ctx.measureText(it.label, ls, Math.max(1, labelW))
    const lines = clipLines(m.lines, 1)
    nodes.push({ k: 'text', part: `row[${i}].label`, box: { x: 0, y: y + (rowH - lh) / 2, width: Math.max(1, labelW), height: lh }, lines, style: ls })
    // Bands.
    if (showBands) {
      const cuts = [0, 0.6, 0.8, 1]
      for (let k = 0; k < 3; k++) {
        nodes.push(solidRect({ x: bx + bw * cuts[k], y, width: bw * (cuts[k + 1] - cuts[k]), height: rowH }, bands[k], `row[${i}].band[${k}]`))
      }
    } else {
      nodes.push(solidRect({ x: bx, y, width: bw, height: rowH }, bands[2], `row[${i}].band[0]`))
    }
    // Value bar, a third to half of the row.
    const barH = Math.max(4, rowH * 0.36)
    if (value > 0) nodes.push(solidRect({ x: bx, y: y + (rowH - barH) / 2, width: Math.max(2, xv(value) - bx), height: barH }, c.accent, `row[${i}].bar`))
    // Target tick.
    if (it.target !== null) {
      const tickH = rowH * 0.7
      nodes.push(solidRect({ x: xv(target) - 2, y: y + (rowH - tickH) / 2, width: 4, height: tickH }, c.text, `row[${i}].target`))
    }
    // Value text.
    nodes.push(...textAligned(ctx, valueTexts[i], vs, { x: W - valueW, y: y + (rowH - lh) / 2, width: valueW }, 'end', `row[${i}].value`).nodes.slice(0, 1))
  })
  return root(ctx, nodes)
}

export function capacity(props: BulletChartProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ items: { max: BULLET_MAX_ITEMS, used: asArr(props.items).length } }, true, [{ kind: 'truncate', slot: 'items' }])
}
