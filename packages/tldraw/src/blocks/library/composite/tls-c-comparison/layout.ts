/**
 * Pure layout function for tls.c.comparison — comparison of 2–3 columns.
 *
 * Splits the box horizontally into N equal columns, each with a title
 * at the top and a list of bullet items below. Delegates text rendering to:
 *   - tls.t.title for column titles
 *   - ctx.measureText for item lines (same pattern as tls.c.agenda)
 *
 * The highlighted column (if set) gets a background rect with an accent
 * surface resolved via ctx.resolveColor — never a literal hex.
 *
 * Indexed parts follow the convention: col[0].title, col[0].item[0],
 * col[0].item[1], col[1].title, col[1].item[0], … in DOM order.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { ComparisonProps } from './schema'
import { withRealWidths, tintOf } from '../../data/_chart/kit'

const MAX_COLUMNS = 3
const MIN_COLUMNS = 2

/**
 * RV06 (review G06): the column title was a `tls.t.title` child laid out with the WHOLE box as its
 * height (`layoutChild(spec, {height: H})`), so it reported H as its own height and every item was
 * pushed to y = H + gap: below the box (the card showed three titles and nothing else; the
 * compiler measured 921 units in a 752 region). The title is now a heading text node measured with
 * the column width, the items follow at their measured pitch, a bullet dot leads each item, and the
 * highlighted column gets a tinted panel so the highlight is visible.
 */
function layoutColumn(
  colIndex: number,
  title: string,
  items: string[],
  x: number,
  w: number,
  ctx: LayoutContext,
  isHighlighted: boolean,
  pad: number,
  titleH: number,
): { children: LayoutNode[]; contentHeight: number } {
  const children: LayoutNode[] = []
  const inner = Math.max(10, w - 2 * pad)
  const ix = x + pad
  const sp = ctx.tokens.space

  const titleStyle = {
    ...ctx.resolveText('subheading'),
    color: isHighlighted ? ctx.resolveColor('accent').color : ctx.resolveColor('text').color,
  }
  const tm = ctx.measureText(title, titleStyle, inner)
  children.push({
    k: 'text',
    part: `col[${colIndex}].title`,
    box: { x: ix, y: pad, width: inner, height: tm.height },
    lines: tm.lines,
    style: titleStyle,
  })

  // Items start at the same y in every column (the tallest title decides), so the rows line up.
  let itemY = pad + titleH + sp.sm
  const itemStyle = { ...ctx.resolveText('body'), color: ctx.resolveColor('text').color }
  const dot = Math.max(6, Math.round(itemStyle.size * 0.28))
  const indent = dot + sp.xs + 4
  const gap = sp.xs
  const bulletColor = isHighlighted ? ctx.resolveColor('accent').color : ctx.resolveColor('textMuted').color
  const lineH = itemStyle.size * itemStyle.lineHeight

  for (let j = 0; j < items.length; j++) {
    const itemText = items[j]
    if (!itemText) continue
    const m = ctx.measureText(itemText, itemStyle, Math.max(10, inner - indent))
    children.push({
      k: 'rect',
      part: `col[${colIndex}].bullet[${j}]`,
      box: { x: ix, y: itemY + (lineH - dot) / 2, width: dot, height: dot },
      fill: { type: 'solid', color: bulletColor },
      radius: dot / 2,
    } as LayoutNode)
    children.push({
      k: 'text',
      part: `col[${colIndex}].item[${j}]`,
      box: { x: ix + indent, y: itemY, width: Math.max(10, inner - indent), height: m.height },
      lines: m.lines,
      style: { ...itemStyle },
    })
    itemY += m.height + gap
  }

  const contentHeight = itemY - gap + pad
  return { children, contentHeight }
}

export function layout(props: ComparisonProps, ctx0: LayoutContext): LayoutNode {
  // Browser-true single-line widths: the item wrapping decides the height (RV06).
  const ctx = withRealWidths(ctx0)
  const columns = props.columns ?? []
  const highlightIdx = props.highlight != null ? props.highlight : null
  const W = ctx.box.width

  // Clamp column count
  const n = Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, columns.length))

  if (columns.length === 0) {
    return {
      k: 'group',
      box: { x: 0, y: 0, width: W, height: 0 },
      part: 'root',
      children: [],
    }
  }

  const gap = ctx.tokens.space.md
  const pad = ctx.tokens.space.md
  const totalGap = (n - 1) * gap
  const colWidth = Math.max(10, (W - totalGap) / n)

  // First pass: measure all columns to find the tallest content height
  const titleStyle = ctx.resolveText('subheading')
  const titleH = Math.max(
    0,
    ...columns.slice(0, n).map((col) => ctx.measureText(col.title, titleStyle, Math.max(10, colWidth - 2 * pad)).height)
  )
  const measured = columns.slice(0, n).map((col, ci) => {
    const colX = ci * (colWidth + gap)
    const { children, contentHeight } = layoutColumn(ci, col.title, col.items ?? [], colX, colWidth, ctx, highlightIdx === ci, pad, titleH)
    return { children, contentHeight, colX }
  })

  const maxContentH = Math.max(0, ...measured.map((m) => m.contentHeight))
  const allChildren: LayoutNode[] = []
  const surface = ctx.resolveColor('surface').color
  const accent = ctx.resolveColor('accent').color
  measured.forEach((m, ci) => {
    // The highlighted column sits on a tinted panel as tall as the tallest column.
    if (highlightIdx === ci) {
      allChildren.push({
        k: 'rect',
        box: { x: m.colX, y: 0, width: colWidth, height: maxContentH },
        fill: { type: 'solid', color: tintOf(surface, accent, 0.14) },
        radius: ctx.tokens.space.sm,
      } as LayoutNode)
    }
  })
  // RVM3: the columns' content in reading order across the columns (all titles, then the first item
  // of every column, then the second…), so the motion recipe's stagger reveals the columns side by
  // side, row by row. Nothing overlaps, so the paint order is free.
  const rowOf = (n: LayoutNode) => {
    const m = /\.(?:item|bullet)\[(\d+)\]$/.exec(n.part ?? '')
    return m ? Number(m[1]) + 1 : 0
  }
  const rows = Math.max(0, ...measured.flatMap((m) => m.children.map(rowOf)))
  for (let r = 0; r <= rows; r++) for (const m of measured) allChildren.push(...m.children.filter((n) => rowOf(n) === r))

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: maxContentH },
    part: 'root',
    children: allChildren,
  }
}

/**
 * Estimate how many items fit per column at the given box. Used by capacity().
 * Measures a "typical" item line and divides available height (after title + gap)
 * by that pitch.
 */
export function estimateItemsPerColumn(
  ctx: LayoutContext,
  box: { width: number; height: number },
  columnCount: number,
): number {
  const gap = ctx.tokens.space.lg
  const totalGap = (columnCount - 1) * gap
  const colWidth = Math.max(10, (box.width - totalGap) / columnCount)

  // Estimate title height (one heading line)
  const titleStyle = ctx.resolveText('subheading')
  const titleM = ctx.measureText('Typical Title', titleStyle, colWidth)
  const titleHeight = titleM.height

  // Estimate one item line height
  const itemStyle = ctx.resolveText('body')
  const itemM = ctx.measureText('Typical item text', itemStyle, colWidth)
  const itemLineHeight = itemM.height
  const itemGap = ctx.tokens.space.xs

  const availableForItems = box.height - titleHeight - ctx.tokens.space.sm
  const itemPitch = itemLineHeight + itemGap

  return Math.max(1, Math.floor(availableForItems / itemPitch))
}
