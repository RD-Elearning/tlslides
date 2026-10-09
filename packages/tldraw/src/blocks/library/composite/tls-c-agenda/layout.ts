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
import { alignText } from '../_kit'
import { onColor, readableOn, tintOf } from '../../text/_engine/color'
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
/** AC2 `numbering: badge`: the disc's diameter as a multiple of the index type size. */
const BADGE_DISC = 2

export function layout(props: AgendaProps, ctx: LayoutContext): LayoutNode {
  const n = (props.items ?? []).length
  const cols = ctx.box.width >= TWO_COLUMN_MIN_WIDTH && n >= TWO_COLUMN_MIN_ITEMS && n <= TWO_COLUMN_MAX_ITEMS ? 2 : 1
  // AC2 `variant: cards`: the cards' padding shrinks before the type does not fit at all; a box
  // that holds no tier as cards lays the items out as the list (the look is a preference).
  const pads: Array<CardPad | undefined> = props.variant === 'cards' ? ['lg', 'sm', undefined] : [undefined]
  let node: LayoutNode | undefined
  for (const pad of pads) {
    for (const tier of TIERS) {
      const candidate = place(props, ctx, tier, cols, pad)
      if (candidate.box.height <= ctx.box.height + 0.5) return candidate
      if (!pad && tier === TIERS[TIERS.length - 1]) node = candidate
    }
  }
  return node as LayoutNode
}

type CardPad = 'lg' | 'sm'

function place(props: AgendaProps, ctx: LayoutContext, tier: (typeof TIERS)[number], cols: 1 | 2 = 1, cardPad?: CardPad): LayoutNode {
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

  // AC2 knobs: `variant: cards` puts each item on a card (inner padding `pad`); `numbering`
  // `badge` draws the number in a disc, `none` drops the number column.
  const cards = cardPad !== undefined
  const numbering = props.numbering === 'badge' || props.numbering === 'none' ? props.numbering : 'plain'
  const pad = cardPad ? ctx.tokens.space[cardPad] : 0
  // Two columns hold half the rows, so the rows get more air (AC1.5).
  const gap0 = ctx.tokens.space[cols === 2 ? 'xl' : tier.gap]
  const gap = cards ? Math.max(gap0, ctx.tokens.space[cardPad === 'lg' ? 'md' : 'sm']) : gap0
  const indexStyle0 = ctx.resolveText(tier.index)
  // two digits at the index size, never narrower than the old fixed column
  const plainIndexWidth = Math.max(ctx.tokens.space.xl, Math.ceil(ctx.measureText('88', indexStyle0, 1000).width) + ctx.tokens.space.xs)
  const disc = Math.round(indexStyle0.size * BADGE_DISC)
  const indexWidth = numbering === 'none' ? 0 : numbering === 'badge' ? disc : plainIndexWidth
  const indexGap = numbering === 'none' ? 0 : numbering === 'badge' ? ctx.tokens.space.md : ctx.tokens.space.sm

  const inner: Size = { width: ctx.box.width, height: ctx.box.height }
  const colGap = ctx.tokens.space['2xl']
  const colW = cols === 2 ? Math.max(0, (inner.width - colGap) / 2) : inner.width
  const perCol = Math.ceil(items.length / cols)
  const contentWidth = Math.max(0, colW - 2 * pad - indexWidth - indexGap)

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

    const m = measureRow(item, titleStyle, noteStyle, contentWidth, ctx)
    // A badge centres on the title's first line; a disc taller than that line pushes the text down.
    const lineH = titleStyle.size * (titleStyle.scale ?? 1) * titleStyle.lineHeight
    const textDy = numbering === 'badge' ? Math.max(0, (disc - lineH) / 2) : 0
    const discDy = numbering === 'badge' ? Math.max(0, (lineH - disc) / 2) : 0
    const rowHeight = Math.max(m.rowHeight + textDy, numbering === 'badge' ? discDy + disc : 0) + 2 * pad

    return { item, i, isCurrent, titleStyle, titleHeight: m.titleHeight, noteHeight: m.noteHeight, rowHeight, textDy, discDy }
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
  const accent = ctx.resolveColor('accent').color
  const surface = ctx.resolveColor('surface').color

  for (const row of rows) {
    const { item, i, isCurrent, titleStyle, titleHeight, noteHeight, textDy, discDy } = row
    const x0 = Math.floor(i / perCol) * (colW + colGap)
    if (cards) {
      // Structural card (no part): every card in a row is as tall as the row.
      children.push({
        k: 'rect',
        box: { x: x0, y: rowY[i % perCol], width: colW, height: rowH[i % perCol] },
        fill: { type: 'solid', color: ctx.resolveColor('surfaceAlt').color },
        radius: ctx.tokens.radius.md,
      })
    }
    const y = rowY[i % perCol] + pad
    const cx = x0 + pad

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
    if (numbering === 'plain') {
      const indexStyle: ResolvedTextStyle = {
        ...indexStyle0,
        color: indexColor,
      }
      const indexM = ctx.measureText(indexText, indexStyle, indexWidth)
      children.push({
        k: 'text',
        part: `item[${i}].index`,
        box: { x: cx, y, width: indexWidth, height: indexM.height },
        lines: indexM.lines,
        style: { ...indexStyle, color: indexColor },
      })
    } else if (numbering === 'badge') {
      // The disc and its number reveal together as the item's index part. Current item: an accent
      // disc with the on-accent number; the others: a soft accent tint with the accent number.
      const fill = isCurrent ? accent : tintOf(surface, accent, 0.14)
      const ink = isCurrent ? readableOn(onColor(ctx, accent), accent) : readableOn(accent, fill)
      const numStyle: ResolvedTextStyle = { ...indexStyle0, color: ink }
      const numM = ctx.measureText(indexText, numStyle, disc)
      const numH = numM.height
      const dy = y + discDy
      children.push({
        k: 'group',
        part: `item[${i}].index`,
        box: { x: 0, y: 0, width: ctx.box.width, height: totalContentHeight },
        children: [
          { k: 'rect', box: { x: cx, y: dy, width: disc, height: disc }, fill: { type: 'solid', color: fill }, radius: disc / 2 },
          ...alignText([{ k: 'text', box: { x: cx, y: dy + (disc - numH) / 2, width: disc, height: numH }, lines: numM.lines, style: numStyle }], 'center'),
        ],
      })
    }

    // Title
    const tx = cx + indexWidth + indexGap
    const titleM = ctx.measureText(item.title, titleStyle, contentWidth)
    children.push({
      k: 'text',
      part: `item[${i}].title`,
      box: { x: tx, y: y + textDy, width: contentWidth, height: titleHeight },
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
          x: tx,
          y: y + textDy + titleHeight + ctx.tokens.space.xs,
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
