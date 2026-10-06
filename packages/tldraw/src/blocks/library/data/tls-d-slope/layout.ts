/**
 * Pure layout for tls.d.slope — two vertical rails, one line per item, labels on both outer sides.
 *
 * Left labels read "name  start" (right-aligned against the left rail) and right labels "end
 * name" (left-aligned from the right rail). Labels are nudged apart so they never overlap; the
 * line still ends at the true value. Colours: one accent for every line, or with a highlight the
 * risers (`positive`) or fallers (`negative`) in colour and the rest dimmed.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { SlopeProps } from './schema'
import { SLOPE_MAX_ITEMS } from './schema'
import { directLabel } from '../_engine/direct-label'
import {
  asArr, capacityOf, chartColors, clamp, dimmed, dot, ellipsize, emptyState, enumOf, fmtNum, lineH, mutedStyle, numOrNull, pathNode, root, solidRect, str, style,
  textAligned,
  withRealWidths,
} from '../_chart/kit'

export function layout(props: SlopeProps, ctx0: LayoutContext): LayoutNode {
  // Browser-true single-line widths for every label decision (RV05).
  const ctx = withRealWidths(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = asArr<Record<string, unknown>>(props.items)
    .slice(0, SLOPE_MAX_ITEMS)
    .map((it) => ({ name: str(it?.name), start: numOrNull(it?.start), end: numOrNull(it?.end) }))
    .filter((it): it is { name: string; start: number; end: number } => it.start !== null && it.end !== null)
  if (items.length === 0) return emptyState(ctx)

  const c = chartColors(ctx)
  const ts = style(ctx, 'caption', c.text)
  const hs = mutedStyle(ctx, 'caption')
  const lh = lineH(ts)
  const fmt = props.format
  const mode = enumOf(props.highlight, ['none', 'risers', 'fallers'] as const, 'none')
  const nodes: LayoutNode[] = []

  const leftText = items.map((it) => `${it.name}  ${fmtNum(it.start, fmt)}`)
  const rightText = items.map((it) => `${fmtNum(it.end, fmt)}  ${it.name}`)
  const maxSide = W * 0.36
  const wOf = (t: string) => ctx.measureText(t, ts).width * 1.08
  const leftW = Math.min(maxSide, Math.ceil(Math.max(...leftText.map(wOf))))
  const rightW = Math.min(maxSide, Math.ceil(Math.max(...rightText.map(wOf))))
  const gap = 14
  const xL = leftW + gap
  const xR = Math.max(xL + 40, W - rightW - gap)

  const headerH = lh + 8
  const top = headerH + 8
  const bottom = Math.max(top + 1, H - lh / 2 - 6)
  const all = items.flatMap((it) => [it.start, it.end])
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const y = (v: number) => (hi === lo ? (top + bottom) / 2 : bottom - ((v - lo) / (hi - lo)) * (bottom - top))

  // Column headers.
  for (const [x, text, part] of [[xL, str(props.startLabel), 'head.start'], [xR, str(props.endLabel), 'head.end']] as const) {
    const w = Math.min(W * 0.3, Math.ceil(ctx.measureText(text, hs).width * 1.12) + 2)
    nodes.push(...textAligned(ctx, ellipsize(ctx, text, hs, w), hs, { x: clamp(x - w / 2, 0, Math.max(0, W - w)), y: 0, width: w }, 'center', part).nodes.slice(0, 1))
  }
  // Rails.
  nodes.push(solidRect({ x: xL - 1, y: top - 4, width: 2, height: bottom - top + 8 }, c.line, 'rail.start'))
  nodes.push(solidRect({ x: xR - 1, y: top - 4, width: 2, height: bottom - top + 8 }, c.line, 'rail.end'))

  const rises = (it: { start: number; end: number }) => it.end > it.start
  const falls = (it: { start: number; end: number }) => it.end < it.start
  const colorOf = (it: { start: number; end: number }) => {
    if (mode === 'none') return c.accent
    const on = mode === 'risers' ? rises(it) : falls(it)
    return on ? ctx.resolveColor(mode === 'risers' ? 'positive' : 'negative').color : dimmed(c, ctx.resolveColor('neutral').color)
  }
  const emphasised = (it: { start: number; end: number }) => mode === 'none' || (mode === 'risers' ? rises(it) : falls(it))

  const order = items.map((_, i) => i).sort((a, b) => Number(emphasised(items[a])) - Number(emphasised(items[b])))
  for (const i of order) {
    const it = items[i]
    const col = colorOf(it)
    nodes.push(pathNode(ctx, `M${xL} ${y(it.start)}L${xR} ${y(it.end)}`, `line[${i}]`, { stroke: col, strokeWidth: emphasised(it) ? 5 : 3 }))
    nodes.push(dot(xL, y(it.start), 6, col, `line[${i}].start`))
    nodes.push(dot(xR, y(it.end), 6, col, `line[${i}].end`))
  }

  // Labels, nudged apart per side.
  const ysL = directLabel(items.map((it) => ({ y: y(it.start) - lh / 2 })), { x: 0, y: top - lh / 2, width: 1, height: bottom - top + lh }, { labelHeight: lh, gap: 2 })
  const ysR = directLabel(items.map((it) => ({ y: y(it.end) - lh / 2 })), { x: 0, y: top - lh / 2, width: 1, height: bottom - top + lh }, { labelHeight: lh, gap: 2 })
  items.forEach((it, i) => {
    const ink = { ...ts, color: emphasised(it) ? c.text : c.muted }
    // Clip the NAME, never the number: "Product A…  80" reads, "Product A ..." does not.
    const vL = fmtNum(it.start, fmt)
    const vR = fmtNum(it.end, fmt)
    const nameL = ellipsize(ctx, it.name, ts, Math.max(10, leftW / 1.04 - ctx.measureText(`  ${vL}`, ts).width))
    const nameR = ellipsize(ctx, it.name, ts, Math.max(10, rightW / 1.04 - ctx.measureText(`${vR}  `, ts).width))
    const lt = `${nameL}  ${vL}`
    const rt = `${vR}  ${nameR}`
    nodes.push(...textAligned(ctx, lt, ink, { x: 0, y: ysL[i], width: leftW }, 'end', `label[${i}].start`).nodes.slice(0, 1))
    nodes.push(...textAligned(ctx, rt, ink, { x: xR + gap, y: ysR[i], width: rightW }, 'start', `label[${i}].end`).nodes.slice(0, 1))
  })
  return root(ctx, nodes)
}

export function capacity(props: SlopeProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ items: { max: SLOPE_MAX_ITEMS, used: asArr(props.items).length } }, true, [{ kind: 'truncate', slot: 'items' }])
}
