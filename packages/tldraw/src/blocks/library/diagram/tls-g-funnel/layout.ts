/**
 * Pure layout for tls.g.funnel — stages that narrow from broad to focused, a label in each stage and
 * a note beside it (vertical) / below it (horizontal), or inside it.
 *
 * Vertical: trapezoids stacked top to bottom, each bottom edge meeting the next top edge, centred
 * on one axis. Horizontal: the same rotated, narrowing left to right. No values: widths are an even
 * taper to 30% of the first stage. Labels are clipped to the narrow edge of their stage.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { trapezoidPath } from '../../../layout/diagram'
import type { FunnelProps } from './schema'
import { FUNNEL_MAX } from './schema'
import { asArr, capacityOf, chartColors, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, onColor, pathNode, placeLines, rampColor, root, solidRect, str, style } from '../_kit'

const TAPER = 0.3
const GAP = 4

export function layout(props: FunnelProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const stages = objs(props.stages)
    .slice(0, FUNNEL_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text) }))
  const N = stages.length
  if (N < 1) return emptyState(ctx, 'No stages')
  const c = chartColors(ctx)
  const horizontal = enumOf(props.orientation, ['vertical', 'horizontal'] as const, 'vertical') === 'horizontal'
  const inside = enumOf(props.notes, ['side', 'inside'] as const, 'side') === 'inside'
  const labelS = style(ctx, 'caption', c.text)
  const noteS = mutedStyle(ctx, 'footnote')
  const nodes: LayoutNode[] = []
  const widthAt = (u: number) => 1 - (1 - TAPER) * u // u in 0..1 along the funnel

  if (!horizontal) {
    const fw = inside ? W : Math.max(60, W * 0.5)
    const rowH = Math.min(120, Math.max(1, (H - (N - 1) * GAP) / N))
    const y0 = Math.max(0, (H - (N * rowH + (N - 1) * GAP)) / 2)
    const noteX = fw + 40
    stages.forEach((s, i) => {
      const y = y0 + i * (rowH + GAP)
      const topW = fw * widthAt(i / N)
      const botW = fw * widthAt((i + 1) / N)
      const fill = rampColor(ctx, 'gradient', i, N)
      const ink = onColor(ctx, fill)
      nodes.push(pathNode(ctx, trapezoidPath({ x: (fw - topW) / 2, y, width: topW, height: rowH }, 0, (topW - botW) / 2), `stage[${i}]`, { fill }))
      const tw = Math.max(8, botW - 24)
      const tx = (fw - tw) / 2
      if (inside) {
        const lh = linesHeight(ctx, s.label, labelS, tw, 1)
        const room = rowH - lh - 8
        const nl = s.text ? Math.max(0, Math.floor(room / lineH(noteS))) : 0
        const nh = nl > 0 ? linesHeight(ctx, s.text, noteS, tw, nl) : 0
        const top = y + Math.max(0, (rowH - lh - (nh ? 2 + nh : 0)) / 2)
        nodes.push(...placeLines(ctx, s.label, { ...labelS, color: ink }, { x: tx, y: top, width: tw }, 'center', 1, `label[${i}]`).nodes)
        if (nh) nodes.push(...placeLines(ctx, s.text, { ...noteS, color: ink }, { x: tx, y: top + lh + 2, width: tw }, 'center', nl, `note[${i}]`).nodes)
      } else {
        const ll = Math.max(1, Math.min(2, Math.floor((rowH - 2) / lineH(labelS))))
        const lh = linesHeight(ctx, s.label, labelS, tw, ll)
        nodes.push(...placeLines(ctx, s.label, { ...labelS, color: ink }, { x: tx, y: y + Math.max(0, (rowH - lh) / 2), width: tw }, 'center', ll, `label[${i}]`).nodes)
        const nw = Math.max(20, W - noteX)
        if (s.text) {
          const nl = Math.max(1, Math.floor((rowH - 4) / lineH(noteS)))
          const nh = linesHeight(ctx, s.text, noteS, nw, nl)
          nodes.push(solidRect({ x: (fw + topW) / 2 + 8, y: y + rowH / 2 - 1, width: Math.max(0, noteX - 10 - ((fw + topW) / 2 + 8)), height: 2 }, c.line, `leader[${i}]`))
          nodes.push(...placeLines(ctx, s.text, { ...noteS, color: c.text }, { x: noteX, y: y + (rowH - nh) / 2, width: nw }, 'start', nl, `note[${i}]`).nodes)
        }
      }
    })
  } else {
    const colW = (W - (N - 1) * GAP) / N
    const hs = inside ? H : Math.max(40, H * 0.5)
    const yc = hs / 2
    stages.forEach((s, i) => {
      const x = i * (colW + GAP)
      const hL = hs * widthAt(i / N)
      const hR = hs * widthAt((i + 1) / N)
      const fill = rampColor(ctx, 'gradient', i, N)
      const ink = onColor(ctx, fill)
      const f = (v: number) => String(Math.round(v * 100) / 100)
      nodes.push(pathNode(ctx, `M${f(x)} ${f(yc - hL / 2)}L${f(x + colW)} ${f(yc - hR / 2)}L${f(x + colW)} ${f(yc + hR / 2)}L${f(x)} ${f(yc + hL / 2)}Z`, `stage[${i}]`, { fill }))
      const tw = Math.max(8, colW - 16)
      const tx = x + (colW - tw) / 2
      const lines = inside ? Math.max(1, Math.min(2, Math.floor((hR - 8) / lineH(labelS)))) : 2
      const lh = linesHeight(ctx, s.label, labelS, tw, lines)
      let top = yc - lh / 2
      let nl = 0
      if (inside && s.text) {
        nl = Math.max(0, Math.floor((hR - 8 - lh - 2) / lineH(noteS)))
        if (nl > 0) top = yc - (lh + 2 + linesHeight(ctx, s.text, noteS, tw, nl)) / 2
      }
      nodes.push(...placeLines(ctx, s.label, { ...labelS, color: ink }, { x: tx, y: top, width: tw }, 'center', lines, `label[${i}]`).nodes)
      if (inside && nl > 0) nodes.push(...placeLines(ctx, s.text, { ...noteS, color: ink }, { x: tx, y: top + lh + 2, width: tw }, 'center', nl, `note[${i}]`).nodes)
      if (!inside && s.text) {
        const y = hs + 16
        const nlines = Math.max(1, Math.floor((H - y) / lineH(noteS)))
        nodes.push(...placeLines(ctx, s.text, { ...noteS, color: c.text }, { x: x + 4, y, width: Math.max(8, colW - 8) }, 'center', nlines, `note[${i}]`).nodes)
      }
    })
  }
  return root(ctx, nodes)
}

export function capacity(props: FunnelProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ stages: { max: FUNNEL_MAX, used: asArr(props.stages).length } }, true, [
    { kind: 'reflow', to: 'tls.d.funnel-chart' },
    { kind: 'truncate', slot: 'stages' },
  ])
}
