/**
 * Poster layout for tls.c.feature-grid — the still image used for SVG export
 * and thumbnails.
 *
 * The poster must be honest about height: `compileSlide` stacks regions by
 * measured height, and the poster is what the compiler and the parity harness
 * use for `kind: 'html'` blocks. The poster renders the same text content as the
 * template, using existing text/rect/icon node kinds (no DOM, pure layout).
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { FeatureGridProps } from './schema'

export function poster(props: FeatureGridProps, ctx: LayoutContext): LayoutNode {
  const cells = props.cells ?? []
  const cols = props.columns ?? 3
  const gap = props.gap ?? 24
  const w = ctx.box.width

  const cellW = (w - (cols - 1) * gap) / cols
  const rows = Math.ceil(cells.length / cols)
  const iconSize = 48
  const iconMargin = 12
  const titleMargin = 8

  // Measure each cell to find per-cell heights, then pick the max per row
  const cellData = cells.map((cell) => {
    // Title measurement
    const titleStyle = ctx.resolveText('subheading')
    const titleColor = ctx.resolveColor('text').color
    const titleResolved = { ...titleStyle, color: titleColor }
    const mTitle = ctx.measureText(cell.title, titleResolved, cellW)

    // Desc measurement
    const descStyle = ctx.resolveText('body')
    const descColor = ctx.resolveColor('textMuted').color
    const descResolved = { ...descStyle, color: descColor }
    const mDesc = ctx.measureText(cell.desc, descResolved, cellW)

    const cellH = iconSize + iconMargin + mTitle.height + titleMargin + mDesc.height
    return { cell, mTitle, mDesc, cellH }
  })

  // Calculate row heights
  const rowHeights: number[] = []
  for (let r = 0; r < rows; r++) {
    const start = r * cols
    const end = Math.min(start + cols, cells.length)
    let maxH = 0
    for (let c = start; c < end; c++) {
      maxH = Math.max(maxH, cellData[c].cellH)
    }
    rowHeights.push(maxH)
  }

  // Total height
  let totalH = 0
  for (let r = 0; r < rows; r++) {
    totalH += rowHeights[r]
    if (r < rows - 1) totalH += gap
  }

  // Build child nodes: icon + title + desc per cell, positioned in grid
  const children: LayoutNode[] = []

  for (let i = 0; i < cells.length; i++) {
    const r = Math.floor(i / cols)
    const c = i % cols
    const x = c * (cellW + gap)
    let y = 0
    for (let rr = 0; rr < r; rr++) {
      y += rowHeights[rr] + gap
    }

    const { mTitle, mDesc } = cellData[i]

    // Icon (placeholder rect when icon can't be resolved — degrade gracefully)
    children.push({
      k: 'rect',
      part: `cell[${i}].icon`,
      box: { x, y, width: iconSize, height: iconSize },
      fill: { type: 'solid', color: ctx.resolveColor('accent').color },
      radius: 4,
    })

    // Title
    const titleStyle = ctx.resolveText('subheading')
    const titleColor = ctx.resolveColor('text').color
    const titleResolved = { ...titleStyle, color: titleColor }
    children.push({
      k: 'text',
      part: `cell[${i}].title`,
      box: { x, y: y + iconSize + iconMargin, width: cellW, height: mTitle.height },
      lines: mTitle.lines,
      style: titleResolved,
    })

    // Description
    const descStyle = ctx.resolveText('body')
    const descColor = ctx.resolveColor('textMuted').color
    const descResolved = { ...descStyle, color: descColor }
    children.push({
      k: 'text',
      part: `cell[${i}].desc`,
      box: { x, y: y + iconSize + iconMargin + mTitle.height + titleMargin, width: cellW, height: mDesc.height },
      lines: mDesc.lines,
      style: descResolved,
    })
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: w, height: totalH },
    part: 'root',
    children,
  }
}
