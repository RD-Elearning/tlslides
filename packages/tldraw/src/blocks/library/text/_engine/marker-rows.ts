/**
 * Marker + text rows in one or two columns. The shared engine behind `tls.t.numbered` and
 * `tls.t.checklist`: a fixed-width marker cell on the left, wrapped item text on the right,
 * items distributed down one column, or balanced over two.
 *
 * Pure and DOM-free.
 */

import type { CapacityReport, LayoutContext, LayoutNode, ResolvedTextStyle, RichText } from '../../../types'

export interface MarkerRowItem {
  text: string | RichText
  /** Part name of the text node, e.g. `item[2].text`. */
  part: string
  /** Inline-edit path of the text, e.g. `items.2`. */
  propPath: string
}

export interface MarkerRowsInput {
  ctx: LayoutContext
  width: number
  columns: 1 | 2
  gap: number
  colGap: number
  items: MarkerRowItem[]
  textStyle: ResolvedTextStyle
  markerWidth: number
  markerHeight: number
  markerGap: number
  /** Build the marker nodes for item `i` inside `box` (the marker cell, vertically placed). */
  markerNodes(i: number, box: { x: number; y: number; width: number; height: number }): LayoutNode[]
  /** Optional hook to add decoration after the text node is placed (e.g. strike-through). */
  decorate?(i: number, textNode: Extract<LayoutNode, { k: 'text' }>): LayoutNode[]
}

export interface MarkerRowsResult {
  nodes: LayoutNode[]
  height: number
  /** Total visual text lines over all items (for capacity). */
  lineCount: number
  /** Height of the tallest column. */
  columnHeights: number[]
}

/** How many items go in the first column when balancing `n` items over `columns` columns. */
export function splitCounts(n: number, columns: 1 | 2): number[] {
  if (columns === 1 || n <= 1) return [n]
  const first = Math.ceil(n / 2)
  return [first, n - first]
}

export function layoutMarkerRows(input: MarkerRowsInput): MarkerRowsResult {
  const { ctx, items, textStyle, gap } = input
  const columns: 1 | 2 = input.columns === 2 && items.length > 1 ? 2 : 1
  const width = Math.max(1, input.width)
  const colWidth = columns === 2 ? Math.max(1, (width - input.colGap) / 2) : width
  const textW = Math.max(1, colWidth - input.markerWidth - input.markerGap)
  const firstLineH = textStyle.size * textStyle.lineHeight
  const counts = splitCounts(items.length, columns)

  const nodes: LayoutNode[] = []
  const columnHeights: number[] = []
  let lineCount = 0
  let index = 0

  for (let c = 0; c < counts.length; c++) {
    const x0 = c * (colWidth + input.colGap)
    let y = 0
    for (let k = 0; k < counts[c]; k++, index++) {
      const item = items[index]
      const m = ctx.measureText(item.text, textStyle, textW)
      lineCount += m.lines.length

      const markerOffset = Math.max(0, (firstLineH - input.markerHeight) / 2)
      const textOffset = Math.max(0, (input.markerHeight - firstLineH) / 2)
      const rowH = Math.max(markerOffset + input.markerHeight, textOffset + m.height)

      nodes.push(
        ...input.markerNodes(index, {
          x: x0,
          y: y + markerOffset,
          width: input.markerWidth,
          height: input.markerHeight,
        })
      )
      const textNode: Extract<LayoutNode, { k: 'text' }> = {
        k: 'text',
        part: item.part,
        box: { x: x0 + input.markerWidth + input.markerGap, y: y + textOffset, width: textW, height: m.height },
        lines: m.lines,
        style: textStyle,
        propPath: item.propPath,
      }
      nodes.push(textNode)
      if (input.decorate) nodes.push(...input.decorate(index, textNode))
      y += rowH + gap
    }
    columnHeights.push(Math.max(0, y - gap))
  }

  return { nodes, height: Math.max(0, ...columnHeights), lineCount, columnHeights }
}

/**
 * `capacity()` report for a marker list: fits when the laid-out height is within the box and the
 * item count is within the schema max. Remedies, in order: reflow to two columns (only when still
 * single-column and the box is at least 900 wide), then truncate the `items` slot.
 */
export function markerCapacity(args: {
  rows: MarkerRowsResult
  itemCount: number
  maxItems: number
  columns: 1 | 2
  box: { width: number; height: number }
  gap: number
  lineHeight: number
}): CapacityReport {
  const { rows, itemCount, maxItems, columns, box, gap, lineHeight } = args
  const fits = rows.height <= box.height + 0.5 && itemCount <= maxItems
  const perColumn = Math.max(1, Math.floor((box.height + gap) / (lineHeight + gap)))
  const remedy: CapacityReport['remedy'] = []
  if (!fits) {
    if (columns === 1 && box.width >= 900) remedy.push({ kind: 'reflow', to: "columns: '2'" })
    remedy.push({ kind: 'truncate', slot: 'items' })
  }
  return {
    fits,
    budget: {
      items: { max: maxItems, used: itemCount, unit: 'items' },
      lines: { max: perColumn * columns, used: rows.lineCount, unit: 'lines' },
    },
    remedy,
  }
}
