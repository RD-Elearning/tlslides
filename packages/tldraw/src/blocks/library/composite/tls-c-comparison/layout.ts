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

import type { BlockSpec, LayoutContext, LayoutNode, ResolvedTextStyle } from '../../../types'
import type { ComparisonProps } from './schema'

const MAX_COLUMNS = 3
const MIN_COLUMNS = 2

/**
 * Layout a single column: title at the top, items listed below.
 * Returns an array of child LayoutNodes (title + items) and the
 * measured content height.
 */
function layoutColumn(
  colIndex: number,
  title: string,
  items: string[],
  x: number,
  y: number,
  w: number,
  availableH: number,
  ctx: LayoutContext,
  isHighlighted: boolean,
): { children: LayoutNode[]; contentHeight: number } {
  const children: LayoutNode[] = []

  // Resolve colours
  const titleColor = isHighlighted
    ? ctx.resolveColor('accent').color
    : ctx.resolveColor('text').color
  const itemColor = ctx.resolveColor('text').color

  // Title — delegate to tls.t.title via ctx.layoutChild
  const titleSpec: BlockSpec = {
    id: `col-${colIndex}-title`,
    type: 'tls.t.title',
    props: {
      text: title,
      size: 'heading',
      align: 'start',
    },
  }
  const titleNode = ctx.layoutChild(titleSpec, { x, y, width: w, height: availableH })
  const titledNode = { ...titleNode, part: `col[${colIndex}].title` } as LayoutNode

  // If highlighted, recolour the title node's style
  if (isHighlighted && titledNode.k === 'group' && titledNode.children) {
    for (const child of titledNode.children) {
      if (child.k === 'text' && child.style) {
        child.style = { ...child.style, color: titleColor }
      }
    }
  } else if (isHighlighted && titledNode.k === 'text' && titledNode.style) {
    titledNode.style = { ...titledNode.style, color: titleColor }
  }

  children.push(titledNode)

  const titleHeight = titleNode.box.height
  let itemY = y + titleHeight + ctx.tokens.space.sm
  const itemWidth = Math.max(0, w)
  const itemStyle: ResolvedTextStyle = {
    ...ctx.resolveText('body'),
    color: itemColor,
  }
  const gap = ctx.tokens.space.xs

  for (let j = 0; j < items.length; j++) {
    const itemText = items[j]
    if (!itemText) continue

    const m = ctx.measureText(itemText, itemStyle, itemWidth)
    const itemNode: LayoutNode = {
      k: 'text',
      part: `col[${colIndex}].item[${j}]`,
      box: { x, y: itemY, width: itemWidth, height: m.height },
      lines: m.lines,
      style: { ...itemStyle },
    }
    children.push(itemNode)
    itemY += m.height + gap
  }

  const contentHeight = itemY - gap
  return { children, contentHeight }
}

export function layout(props: ComparisonProps, ctx: LayoutContext): LayoutNode {
  const columns = props.columns ?? []
  const highlightIdx = props.highlight != null ? props.highlight : null
  const W = ctx.box.width
  const H = ctx.box.height

  // Clamp column count
  const n = Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, columns.length))

  if (n === 0) {
    return {
      k: 'group',
      box: { x: 0, y: 0, width: W, height: 0 },
      part: 'root',
      children: [],
    }
  }

  const gap = ctx.tokens.space.lg
  const totalGap = (n - 1) * gap
  const colWidth = Math.max(10, (W - totalGap) / n)

  const allChildren: LayoutNode[] = []

  // First pass: measure all columns to find the tallest content height
  const measured = columns.slice(0, n).map((col, ci) => {
    const colX = ci * (colWidth + gap)
    const { children, contentHeight } = layoutColumn(
      ci,
      col.title,
      col.items ?? [],
      colX,
      0,
      colWidth,
      H,
      ctx,
      highlightIdx === ci,
    )
    return { children, contentHeight, colX }
  })

  // Use the tallest column's content height as the root height
  const contentHeights = measured.map((m) => m.contentHeight)
  const maxContentH = contentHeights.length > 0
    ? Math.max(...contentHeights)
    : 0

  // Collect all children
  for (const m of measured) {
    allChildren.push(...m.children)
  }

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
  const titleStyle = ctx.resolveText('heading')
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
