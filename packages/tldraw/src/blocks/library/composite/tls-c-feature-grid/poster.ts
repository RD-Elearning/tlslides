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
import { circleIcon, effectiveColumns, featureGridColors, FG_CARD_PAD, FG_CARD_RADIUS, type FeatureGridProps } from './schema'
import { alignText } from '../_kit'
import { getIcon } from '../../../icons'
import { cssTextHeight } from '../../../html-block'
import { FG_ICON, FG_ICON_GAP, FG_LH, FG_TITLE_GAP } from './template'

export function poster(props: FeatureGridProps, ctx: LayoutContext): LayoutNode {
  const cells = props.cells ?? []
  const gap = props.gap ?? 24
  const w = ctx.box.width
  const cols = effectiveColumns(w, props.columns, gap, cells.length)

  const cellW = (w - (cols - 1) * gap) / cols
  // AC2 knobs: card cells (padded, tinted), centred alignment, icon on a disc.
  const card = props.cell === 'card'
  const center = props.align === 'center'
  const circle = props.iconStyle === 'circle'
  const P = card ? FG_CARD_PAD : 0
  const innerW = Math.max(1, cellW - 2 * P)
  const colors = featureGridColors(ctx.tokens.color as unknown as Record<string, string>)
  const rows = Math.ceil(cells.length / cols)
  const iconSize = circle ? circleIcon(cellW).disc : FG_ICON
  const iconMargin = FG_ICON_GAP
  const titleMargin = FG_TITLE_GAP
  // LO7: the template's metrics (its line-heights, no tracking); heights are CSS line boxes, so
  // the grid below is where the live HTML puts every part.
  const titleStyleOf = () => ({ ...ctx.resolveText('subheading', { letterSpacing: 0, lineHeight: FG_LH.title }), color: ctx.resolveColor('text').color })
  const descStyleOf = () => ({ ...ctx.resolveText('body', { letterSpacing: 0, lineHeight: FG_LH.desc }), color: ctx.resolveColor('textMuted').color })

  // Measure each cell to find per-cell heights, then pick the max per row
  const cellData = cells.map((cell) => {
    const titleResolved = titleStyleOf()
    const m1 = ctx.measureText(cell.title, titleResolved, innerW)
    const mTitle = { lines: m1.lines, height: cssTextHeight(m1.lines.length, titleResolved) }

    const descResolved = descStyleOf()
    const m2 = ctx.measureText(cell.desc, descResolved, innerW)
    const mDesc = { lines: m2.lines, height: cssTextHeight(m2.lines.length, descResolved) }

    const cellH = 2 * P + iconSize + iconMargin + mTitle.height + titleMargin + mDesc.height
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
    const cell = cellData[i].cell
    const iconColor = ctx.resolveColor('accent').color
    if (card) {
      children.push({ k: 'rect', part: `cell[${i}].card`, box: { x, y, width: cellW, height: rowHeights[r] }, fill: { type: 'solid', color: colors.card }, radius: FG_CARD_RADIUS })
    }
    const ix = x + P
    const iy = y + P
    const iconX = center ? ix + (innerW - iconSize) / 2 : ix

    // Icon - use icon node kind, or fallback rect for unknown icons
    const iconDef = getIcon(cell.icon as string)
    if (circle) {
      children.push({ k: 'rect', part: `cell[${i}].icon`, box: { x: iconX, y: iy, width: iconSize, height: iconSize }, fill: { type: 'solid', color: colors.disc }, radius: iconSize / 2 })
      const g = circleIcon(cellW).glyph
      const gb = { x: iconX + (iconSize - g) / 2, y: iy + (iconSize - g) / 2, width: g, height: g }
      if (iconDef) children.push({ k: 'icon', box: gb, icon: iconDef.path, fill: iconColor, strokeWidth: 1.5 })
    } else if (iconDef) {
      children.push({
        k: 'icon',
        part: `cell[${i}].icon`,
        box: { x: iconX, y: iy, width: iconSize, height: iconSize },
        icon: iconDef.path,
        fill: iconColor,
        strokeWidth: 1.5,
      })
    } else {
      // Fallback rect for unknown icon names
      children.push({
        k: 'rect',
        part: `cell[${i}].icon`,
        box: { x: iconX, y: iy, width: iconSize, height: iconSize },
        fill: { type: 'solid', color: iconColor },
        radius: 4,
      })
    }

    const align = center ? 'center' : 'start'
    // Title
    const titleResolved = titleStyleOf()
    children.push(...alignText([{
      k: 'text',
      part: `cell[${i}].title`,
      propPath: `cells.${i}.title`,
      box: { x: ix, y: iy + iconSize + iconMargin, width: innerW, height: mTitle.height },
      lines: mTitle.lines,
      style: titleResolved,
    }], align))

    // Description
    const descResolved = descStyleOf()
    children.push(...alignText([{
      k: 'text',
      part: `cell[${i}].desc`,
      propPath: `cells.${i}.desc`,
      box: { x: ix, y: iy + iconSize + iconMargin + mTitle.height + titleMargin, width: innerW, height: mDesc.height },
      lines: mDesc.lines,
      style: descResolved,
    }], align))
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: w, height: totalH },
    part: 'root',
    children,
  }
}
