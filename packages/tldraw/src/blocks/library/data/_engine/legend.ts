/**
 * Legend as LayoutNodes, returning the plot box that remains. Pure function.
 *
 * Each entry is a swatch (`part: legend/swatch-<i>`) and a label (`part: legend/label-<i>`).
 * `top` / `bottom` flow entries left to right and wrap to further rows when the box is too
 * narrow; `right` stacks them in a column; `none` draws nothing and returns the box unchanged.
 * Charts with a single series should use direct labels instead (see `directLabel`).
 */

import type { Box, LayoutContext, LayoutNode } from '../../../types'

export type LegendPlacement = 'top' | 'bottom' | 'right' | 'none'

export interface LegendItem {
  label: string
  /** Resolved swatch colour (hex). */
  color: string
}

export const LEGEND_SWATCH = 10
const SWATCH_GAP = 6
const ITEM_GAP = 16
const ROW_GAP = 4
/** Space left between the legend and the plot. */
const PLOT_GAP = 8
/** Widest a right-hand legend may grow, as a fraction of the box. */
const MAX_RIGHT_FRACTION = 0.35

type LegendCtx = Pick<LayoutContext, 'measureText' | 'resolveText'>

export function layoutLegend(
  items: ReadonlyArray<LegendItem>,
  box: Box,
  ctx: LegendCtx,
  placement: LegendPlacement
): { nodes: LayoutNode[]; plotBox: Box } {
  if (placement === 'none' || items.length === 0) return { nodes: [], plotBox: { ...box } }

  const style = ctx.resolveText('footnote')
  const rowH = Math.max(LEGEND_SWATCH, Math.ceil(style.size * style.lineHeight))
  const maxLabelW = placement === 'right' ? Math.max(0, box.width * MAX_RIGHT_FRACTION - LEGEND_SWATCH - SWATCH_GAP) : box.width
  const measured = items.map((it) => {
    const m = ctx.measureText(it.label, style, maxLabelW)
    return { it, m, w: Math.min(m.width, maxLabelW) }
  })

  type Placed = { i: number; x: number; y: number; w: number }
  const placed: Placed[] = []
  let width = 0
  let height = 0

  if (placement === 'right') {
    let y = 0
    measured.forEach((e, i) => {
      placed.push({ i, x: 0, y, w: e.w })
      width = Math.max(width, LEGEND_SWATCH + SWATCH_GAP + e.w)
      y += rowH + ROW_GAP
    })
    height = y - ROW_GAP
  } else {
    let x = 0
    let y = 0
    measured.forEach((e, i) => {
      const entryW = LEGEND_SWATCH + SWATCH_GAP + e.w
      if (x > 0 && x + entryW > box.width) {
        x = 0
        y += rowH + ROW_GAP
      }
      placed.push({ i, x, y, w: e.w })
      x += entryW + ITEM_GAP
      width = Math.max(width, x - ITEM_GAP)
    })
    height = y + rowH
  }

  // Legend origin: top = box top; bottom = box bottom; right = box right, vertically centred.
  const originX = placement === 'right' ? box.x + box.width - width : box.x
  const originY =
    placement === 'top' ? box.y : placement === 'bottom' ? box.y + box.height - height : box.y + Math.max(0, (box.height - height) / 2)

  const nodes: LayoutNode[] = []
  for (const p of placed) {
    const e = measured[p.i]
    const x = originX + p.x
    const y = originY + p.y
    nodes.push({
      k: 'rect',
      box: { x, y: y + (rowH - LEGEND_SWATCH) / 2, width: LEGEND_SWATCH, height: LEGEND_SWATCH },
      part: `legend/swatch-${p.i}`,
      fill: { type: 'solid', color: e.it.color },
      radius: 2,
    })
    nodes.push({
      k: 'text',
      box: { x: x + LEGEND_SWATCH + SWATCH_GAP, y, width: p.w, height: rowH },
      part: `legend/label-${p.i}`,
      lines: e.m.lines,
      style,
    })
  }

  let plotBox: Box
  if (placement === 'top') {
    plotBox = { x: box.x, y: box.y + height + PLOT_GAP, width: box.width, height: Math.max(0, box.height - height - PLOT_GAP) }
  } else if (placement === 'bottom') {
    plotBox = { x: box.x, y: box.y, width: box.width, height: Math.max(0, box.height - height - PLOT_GAP) }
  } else {
    plotBox = { x: box.x, y: box.y, width: Math.max(0, box.width - width - PLOT_GAP), height: box.height }
  }
  return { nodes, plotBox }
}
