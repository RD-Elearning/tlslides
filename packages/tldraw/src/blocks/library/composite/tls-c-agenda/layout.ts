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

import { slotItems } from '../_slots'
import type { LayoutContext, LayoutNode, ResolvedTextStyle, Size, TypeToken } from '../../../types'
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

/**
 * Type tiers, biggest first. An agenda is a whole slide, so it takes the largest tier whose rows fit
 * the box (the old fixed `body` tier left a 4-item agenda as a small list in a corner).
 */
const TIERS: ReadonlyArray<{ title: TypeToken; note: TypeToken; index: TypeToken; gap: 'sm' | 'md' }> = [
  { title: 'heading', note: 'body', index: 'body', gap: 'md' },
  { title: 'subheading', note: 'caption', index: 'caption', gap: 'md' },
  { title: 'lead', note: 'caption', index: 'caption', gap: 'sm' },
  { title: 'body', note: 'caption', index: 'caption', gap: 'sm' },
]

/** AC1.5: a wide box with 4–8 items lays the agenda out in two columns (items run down the first
 *  column, then the second), so a full-width agenda slide is not a narrow list with the right half
 *  empty. Below this width, or with fewer items, it stays one column. */
const TWO_COLUMN_MIN_WIDTH = 1200
const TWO_COLUMN_MIN_ITEMS = 4
const TWO_COLUMN_MAX_ITEMS = 8

export function layout(props: AgendaProps, ctx: LayoutContext): LayoutNode {
  const n = (props.items ?? []).length
  const cols = ctx.box.width >= TWO_COLUMN_MIN_WIDTH && n >= TWO_COLUMN_MIN_ITEMS && n <= TWO_COLUMN_MAX_ITEMS ? 2 : 1
  let node = place(props, ctx, TIERS[TIERS.length - 1], cols)
  for (const tier of TIERS) {
    const candidate = place(props, ctx, tier, cols)
    if (candidate.box.height <= ctx.box.height + 0.5 || tier === TIERS[TIERS.length - 1]) {
      node = candidate
      break
    }
  }
  return node
}

function place(props: AgendaProps, ctx: LayoutContext, tier: (typeof TIERS)[number], cols: 1 | 2 = 1): LayoutNode {
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

  // Two columns hold half the rows, so the rows get more air (AC1.5).
  const gap = ctx.tokens.space[cols === 2 ? 'xl' : tier.gap]
  const indexStyle0 = ctx.resolveText(tier.index)
  // two digits at the index size, never narrower than the old fixed column
  const indexWidth = Math.max(ctx.tokens.space.xl, Math.ceil(ctx.measureText('88', indexStyle0, 1000).width) + ctx.tokens.space.xs)

  const inner: Size = { width: ctx.box.width, height: ctx.box.height }
  const colGap = ctx.tokens.space['2xl']
  const colW = cols === 2 ? Math.max(0, (inner.width - colGap) / 2) : inner.width
  const perCol = Math.ceil(items.length / cols)
  const contentWidth = Math.max(0, colW - indexWidth - ctx.tokens.space.sm)

  // Resolve text styles
  const baseTitleStyle = ctx.resolveText(tier.title)
  const noteStyle = ctx.resolveText(tier.note)

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
  // Row r holds item r of every column; it is as tall as its tallest item.
  const rowH = Array.from({ length: perCol }, (_, r) => Math.max(...rows.filter((_, i) => i % perCol === r).map((x) => x.rowHeight)))
  const rowY: number[] = []
  let acc = 0
  for (let r = 0; r < perCol; r++) {
    rowY.push(acc)
    acc += rowH[r] + (r < perCol - 1 ? gap : 0)
  }
  const totalContentHeight = acc

  // Place nodes
  const children: LayoutNode[] = []

  for (const row of rows) {
    const { item, i, isCurrent, titleStyle, titleHeight, noteHeight } = row
    const y = rowY[i % perCol]
    const x0 = Math.floor(i / perCol) * (colW + colGap)

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
      ...indexStyle0,
      color: indexColor,
    }
    const indexM = ctx.measureText(indexText, indexStyle, indexWidth)
    children.push({
      k: 'text',
      part: `item[${i}].index`,
      box: { x: x0, y, width: indexWidth, height: indexM.height },
      lines: indexM.lines,
      style: { ...indexStyle, color: indexColor },
    })

    // Title
    const titleM = ctx.measureText(item.title, titleStyle, contentWidth)
    children.push({
      k: 'text',
      part: `item[${i}].title`,
      box: { x: x0 + indexWidth + ctx.tokens.space.sm, y, width: contentWidth, height: titleHeight },
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
          x: x0 + indexWidth + ctx.tokens.space.sm,
          y: y + titleHeight + ctx.tokens.space.xs,
          width: contentWidth,
          height: noteHeight,
        },
        lines: noteM.lines,
        style: { ...noteStyle, color: noteColor },
      })
    }
  }

  // RVM5: each note sits in a slot `note[i]` emitted for every item (empty without a note), so
  // note i always follows title i in the stagger even when an earlier item has no note.
  const noteOf = (n: LayoutNode) => {
    const m = /^item\[(\d+)\]\.note$/.exec(n.part ?? '')
    return m ? Number(m[1]) : -1
  }
  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: totalContentHeight },
    part: 'root',
    children: slotItems(children, items.length, 'note', noteOf, { width: ctx.box.width, height: totalContentHeight }),
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
  const colWidth = box.width >= TWO_COLUMN_MIN_WIDTH ? (box.width - ctx.tokens.space['2xl']) / 2 : box.width
  const contentWidth = Math.max(0, colWidth - indexWidth - ctx.tokens.space.sm)
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
  const rowsFit = Math.max(1, Math.floor(box.height / rowPitch))
  // AC1.5: a wide box holds two columns of rows (see TWO_COLUMN_MIN_WIDTH).
  return box.width >= TWO_COLUMN_MIN_WIDTH ? rowsFit * 2 : rowsFit
}
