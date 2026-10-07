/**
 * Pure layout for tls.g.layers — 2 to 7 equal-weight layers stacked top to bottom.
 *
 * `flat` bars are rounded rects; `perspective` slabs are parallelograms slanted to the right, so
 * the stack reads as a pile of plates. Notes are inside the bar (right column) or beside the stack
 * with a leader. Text is clipped to its column; rows scale to the box, so seven layers always fit.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { iconLeaf } from '../../text/_engine/icon'
import type { LayersProps } from './schema'
import { LAYERS_MAX } from './schema'
import { asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, onColor, pathNode, placeLines, rampColor, root, solidRect, str, style } from '../_kit'
import { slotsByIndex } from '../_motion'

const GAP = 8

export function layout(props: LayersProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const layers = objs(props.layers)
    .slice(0, LAYERS_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text), icon: typeof s.icon === 'string' ? s.icon : '' }))
  const N = layers.length
  if (N < 1) return emptyState(ctx, 'No layers')
  const c = chartColors(ctx)
  const persp = enumOf(props.style, ['flat', 'perspective'] as const, 'flat') === 'perspective'
  const side = enumOf(props.notes, ['side', 'inside'] as const, 'inside') === 'side'
  const rowH = Math.min(120, Math.max(1, (H - (N - 1) * GAP) / N))
  // RV08: tall layers get the next type step up (22/18 units read as specks on a 120-unit bar).
  const big = rowH >= 72
  const labelS = style(ctx, big ? 'body' : 'caption', c.text)
  const noteS = mutedStyle(ctx, big ? 'caption' : 'footnote')
  const total = N * rowH + (N - 1) * GAP
  const y0 = Math.max(0, (H - total) / 2)
  const skew = persp ? Math.min(rowH * 0.9, W * 0.08) : 0
  const barW = side ? Math.max(60, W * 0.56) : W
  const colX = barW + 40
  const colW = Math.max(20, W - colX)
  const nodes: LayoutNode[] = []
  const f = (v: number) => String(Math.round(v * 100) / 100)

  layers.forEach((l, i) => {
    const y = y0 + i * (rowH + GAP)
    const fill = rampColor(ctx, 'gradient', i, N)
    const ink = onColor(ctx, fill)
    if (persp) {
      nodes.push(pathNode(ctx, `M${f(skew)} ${f(y)}L${f(barW)} ${f(y)}L${f(barW - skew)} ${f(y + rowH)}L0 ${f(y + rowH)}Z`, `layer[${i}]`, { fill }))
    } else {
      nodes.push({ k: 'rect', part: `layer[${i}]`, box: { x: 0, y, width: barW, height: rowH }, fill: { type: 'solid', color: fill }, radius: Math.min(14, rowH / 3) })
    }
    // Content area inside the bar: avoid the slanted ends.
    const pad = Math.max(10, skew + 12)
    const cx0 = pad
    const cw = Math.max(20, barW - skew - 2 * pad + (persp ? skew * 0.4 : 0))
    const isz = l.icon && rowH >= 48 ? Math.min(34, rowH - 16) : 0
    const lx = cx0 + (isz ? isz + 12 : 0)
    if (isz) nodes.push(iconLeaf(l.icon, { x: cx0, y: y + (rowH - isz) / 2, width: isz, height: isz }, ink, `icon[${i}]`))
    const innerW = cw - (isz ? isz + 12 : 0)
    const inlineNote = !side && l.text
    const labelW = inlineNote ? innerW * 0.34 : innerW
    const ll = clamp(Math.floor((rowH - 4) / lineH(labelS)), 1, 2)
    const lh = linesHeight(ctx, l.label, labelS, labelW, ll)
    nodes.push(...placeLines(ctx, l.label, { ...labelS, color: ink }, { x: lx, y: y + (rowH - lh) / 2, width: labelW }, 'start', ll, `label[${i}]`).nodes)
    if (inlineNote) {
      const nx = lx + labelW + 16
      const nw = Math.max(20, lx + innerW - nx)
      const nl = Math.max(1, Math.min(3, Math.floor((rowH - 8) / lineH(noteS))))
      const nh = linesHeight(ctx, l.text, noteS, nw, nl)
      nodes.push(...placeLines(ctx, l.text, { ...noteS, color: ink }, { x: nx, y: y + (rowH - nh) / 2, width: nw }, 'start', nl, `note[${i}]`).nodes)
    }
    if (side && l.text) {
      const nl = Math.max(1, Math.min(3, Math.floor((rowH - 4) / lineH(noteS))))
      const nh = linesHeight(ctx, l.text, noteS, colW, nl)
      nodes.push(solidRect({ x: barW - (persp ? skew / 2 : 0) + 8, y: y + rowH / 2 - 1, width: Math.max(0, colX - 10 - (barW - (persp ? skew / 2 : 0) + 8)), height: 2 }, c.line, `leader[${i}]`))
      nodes.push(...placeLines(ctx, l.text, { ...noteS, color: c.text }, { x: colX, y: y + (rowH - nh) / 2, width: colW }, 'start', nl, `note[${i}]`).nodes)
    }
  })
  // RVM4: layer i wipes in over its own bar (`slab[i]`, a tight group), its icon, label, note and
  // leader follow as one slot (`cap[i]`, emitted for every layer).
  return root(
    ctx,
    slotsByIndex(nodes, N, { width: W, height: H }, [
      { name: 'slab', match: /^layer\[(\d+)\]$/, tight: true },
      { name: 'cap', match: /^(?:label|note|leader|icon)\[(\d+)\]$/ },
    ])
  )
}

export function capacity(props: LayersProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ layers: { max: LAYERS_MAX, used: asArr(props.layers).length } }, true, [
    { kind: 'truncate', slot: 'layers' },
    { kind: 'paginate' },
  ])
}
