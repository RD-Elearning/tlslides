/**
 * Pure layout function for tls.c.agenda — agenda / table-of-contents.
 *
 * Vertical list of numbered items. Each item has an index number, a title,
 * and an optional note. The "current" item is emphasised with accent colour
 * and larger text; other items are muted.
 *
 * Indexed parts follow the tls.t.bullets convention: item[0].index,
 * item[0].title, item[0].note, item[1].index, etc.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle, Size } from '../../../types'
import type { AgendaItem, AgendaProps } from './schema'

/**
 * Measure one agenda row's height. A row consists of a title line and an
 * optional note line. Returns the total height of the row.
 */
function measureRow(
  item: AgendaItem,
  titleStyle: ResolvedTextStyle,
  noteStyle: ResolvedTextStyle,
  contentWidth: number,
  ctx: LayoutContext,
): { titleHeight: number; noteHeight: number; rowHeight: number } {
  const titleM = ctx.measureText(item.title, titleStyle, contentWidth)
  let noteHeight = 0
  if (item.note) {
    const noteM = ctx.measureText(item.note, noteStyle, contentWidth)
    noteHeight = noteM.height
  }
  return {
    titleHeight: titleM.height,
    noteHeight,
    rowHeight: titleM.height + (noteHeight > 0 ? noteHeight + ctx.tokens.space.xs : 0),
  }
}

export function layout(props: AgendaProps, ctx: LayoutContext): LayoutNode {
  const items = props.items ?? []
  const currentIdx = props.current != null ? props.current : null

  if (items.length === 0) {
    return {
      k: 'group',
      box: { x: 0, y: 0, width: ctx.box.width, height: 0 },
      part: 'root',
      children: [],
    }
  }

  const gap = ctx.tokens.space.sm
  const indexWidth = ctx.tokens.space.xl

  const inner: Size = { width: ctx.box.width, height: ctx.box.height }
  const contentWidth = Math.max(0, inner.width - indexWidth - ctx.tokens.space.sm)

  // Resolve text styles
  const baseTitleStyle = ctx.resolveText('body')
  const noteStyle = ctx.resolveText('caption')

  // We'll do two passes: measure all rows first, then place them.
  const rows = items.map((item, i) => {
    const isCurrent = currentIdx === i

    // Current item gets a slightly larger, bolder style
    const titleStyle: ResolvedTextStyle = isCurrent
      ? { ...baseTitleStyle, size: baseTitleStyle.size * 1.15 }
      : baseTitleStyle

    const { titleHeight, noteHeight, rowHeight } = measureRow(
      item, titleStyle, noteStyle, contentWidth, ctx,
    )

    return { item, i, isCurrent, titleStyle, titleHeight, noteHeight, rowHeight }
  })

  // Compute total content height
  const totalContentHeight = rows.reduce(
    (sum, r, i) => sum + r.rowHeight + (i < rows.length - 1 ? gap : 0), 0,
  )

  // Place nodes
  const children: LayoutNode[] = []
  let y = 0

  for (const row of rows) {
    const { item, i, isCurrent, titleStyle, titleHeight, noteHeight, rowHeight } = row

    // Resolve colors based on current state
    const indexColor = isCurrent
      ? ctx.resolveColor('accent').color
      : ctx.resolveColor('textMuted').color
    const titleColor = isCurrent
      ? ctx.resolveColor('accent').color
      : ctx.resolveColor('text').color
    const noteColor = ctx.resolveColor('textMuted').color

    // Index number
    const indexText = `${i + 1}`
    const indexStyle: ResolvedTextStyle = {
      ...ctx.resolveText('caption'),
      color: indexColor,
    }
    const indexM = ctx.measureText(indexText, indexStyle, indexWidth)
    children.push({
      k: 'text',
      part: `item[${i}].index`,
      box: { x: 0, y, width: indexWidth, height: indexM.height },
      lines: indexM.lines,
      style: { ...indexStyle, color: indexColor },
    })

    // Title
    const titleM = ctx.measureText(item.title, titleStyle, contentWidth)
    children.push({
      k: 'text',
      part: `item[${i}].title`,
      box: { x: indexWidth + ctx.tokens.space.sm, y, width: contentWidth, height: titleHeight },
      lines: titleM.lines,
      style: { ...titleStyle, color: titleColor },
    })

    // Note (optional)
    if (item.note) {
      const noteM = ctx.measureText(item.note, noteStyle, contentWidth)
      children.push({
        k: 'text',
        part: `item[${i}].note`,
        box: {
          x: indexWidth + ctx.tokens.space.sm,
          y: y + titleHeight + ctx.tokens.space.xs,
          width: contentWidth,
          height: noteHeight,
        },
        lines: noteM.lines,
        style: { ...noteStyle, color: noteColor },
      })
    }

    y += rowHeight + gap
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: totalContentHeight },
    part: 'root',
    children,
  }
}

/**
 * Estimate how many agenda items fit in the given box. Used by `capacity()`.
 * Does a dry-run measurement of one row (with a typical title length) and
 * divides available height by that estimate.
 */
export function estimateItemCount(
  ctx: LayoutContext,
  box: Size,
): number {
  const indexWidth = ctx.tokens.space.xl
  const contentWidth = Math.max(0, box.width - indexWidth - ctx.tokens.space.sm)
  const gap = ctx.tokens.space.sm

  const titleStyle = ctx.resolveText('body')
  const noteStyle = ctx.resolveText('caption')

  // Measure a "typical" row: short title + short note
  const { rowHeight } = measureRow(
    { title: 'Typical item', note: 'Brief note' },
    titleStyle,
    noteStyle,
    contentWidth,
    ctx,
  )

  const rowPitch = rowHeight + gap
  return Math.max(1, Math.floor(box.height / rowPitch))
}
