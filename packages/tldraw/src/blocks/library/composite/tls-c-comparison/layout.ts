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

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import type { ComparisonProps } from './schema'
import { withRealWidths, tintOf, onColor, readableOn } from '../../data/_chart/kit'
import { alignText } from '../_kit'

const MAX_COLUMNS = 3
const MIN_COLUMNS = 2
/** AC2 `style: versus`: the VS disc's diameter as a multiple of the subheading size, its label. */
const VS_DISC = 2.2
const VS_LABEL = 'VS'

/** Type tiers, biggest first. `plain` keeps the last (the original look); `cards` / `versus` take
 *  the biggest whose columns fit the box height (AC2: a comparison alone under a title should not
 *  be a small band of body text in a tall region). */
type Tier = { title: TypeToken; item: TypeToken; titleGap: 'sm' | 'md' | 'lg' | 'xl'; itemGap: 'xs' | 'sm' | 'md' | 'lg'; pad: 'lg' | 'xl' | '2xl' }
const TIERS: readonly Tier[] = [
  // AC3 pre-item: the roomy tier, for a comparison alone under a title in a tall region.
  { title: 'heading', item: 'lead', titleGap: 'xl', itemGap: 'lg', pad: '2xl' },
  { title: 'heading', item: 'lead', titleGap: 'lg', itemGap: 'md', pad: 'xl' },
  { title: 'heading', item: 'lead', titleGap: 'md', itemGap: 'sm', pad: 'lg' },
  { title: 'subheading', item: 'body', titleGap: 'sm', itemGap: 'xs', pad: 'lg' },
]

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
  tier: Tier = TIERS[TIERS.length - 1],
): { children: LayoutNode[]; contentHeight: number } {
  const children: LayoutNode[] = []
  const inner = Math.max(10, w - 2 * pad)
  const ix = x + pad
  const sp = ctx.tokens.space

  const titleStyle = {
    ...ctx.resolveText(tier.title),
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
  let itemY = pad + titleH + sp[tier.titleGap]
  const itemStyle = { ...ctx.resolveText(tier.item), color: ctx.resolveColor('text').color }
  const dot = Math.max(6, Math.round(itemStyle.size * 0.28))
  const indent = dot + sp.xs + 4
  const gap = sp[tier.itemGap]
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

  // AC2 `style`: `cards` / `versus` put every column on a card with more padding; `versus` widens
  // each gutter to hold its disc.
  // `versus` is for two rivals: three columns are drawn as `cards`.
  const look = props.style === 'versus' ? (n === 2 ? 'versus' : 'cards') : props.style === 'cards' ? 'cards' : 'plain'
  const sp = ctx.tokens.space
  const vsD = look === 'versus' ? Math.round(ctx.resolveText('subheading').size * VS_DISC) : 0
  const gap = look === 'versus' ? vsD + 2 * sp.md : sp.md
  const totalGap = (n - 1) * gap
  const colWidth = Math.max(10, (W - totalGap) / n)

  // First pass: measure all columns to find the tallest content height
  const measureAt = (tier: Tier) => {
    const pad = look === 'plain' ? sp.md : sp[tier.pad]
    const titleStyle = ctx.resolveText(tier.title)
    const titleH = Math.max(
      0,
      ...columns.slice(0, n).map((col) => ctx.measureText(col.title, titleStyle, Math.max(10, colWidth - 2 * pad)).height)
    )
    return columns.slice(0, n).map((col, ci) => {
      const colX = ci * (colWidth + gap)
      const { children, contentHeight } = layoutColumn(ci, col.title, col.items ?? [], colX, colWidth, ctx, highlightIdx === ci, pad, titleH, tier)
      return { children, contentHeight, colX }
    })
  }
  // AC3 pre-item: `plain` takes the type tiers too (its padding stays `md`): a plain comparison
  // alone under a title was a small band of body text in a tall region.
  const tiers = TIERS
  let measured = measureAt(tiers[tiers.length - 1])
  for (const tier of tiers.slice(0, -1)) {
    const m = measureAt(tier)
    if (Math.max(0, ...m.map((x) => x.contentHeight)) <= ctx.box.height + 0.5) {
      measured = m
      break
    }
  }

  const maxContentH = Math.max(0, ...measured.map((m) => m.contentHeight))
  const allChildren: LayoutNode[] = []
  const surface = ctx.resolveColor('surface').color
  const accent = ctx.resolveColor('accent').color
  measured.forEach((m, ci) => {
    if (look !== 'plain') {
      // AC2: every column on a card as tall as the tallest; the highlighted card is the accent tint
      // with an accent outline.
      const hi = highlightIdx === ci
      allChildren.push({
        k: 'rect',
        // the outline is drawn inside the card (a stroke straddles the box edge)
        box: hi ? { x: m.colX + 1.5, y: 1.5, width: colWidth - 3, height: maxContentH - 3 } : { x: m.colX, y: 0, width: colWidth, height: maxContentH },
        fill: { type: 'solid', color: hi ? tintOf(surface, accent, 0.14) : ctx.resolveColor('surfaceAlt').color },
        ...(hi ? { stroke: { color: accent, width: 3 } } : {}),
        radius: ctx.tokens.radius.md,
      } as LayoutNode)
      return
    }
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

  if (look === 'versus') {
    // A structural accent disc with "VS" centred in each gutter, at the cards' mid-height.
    const label = { ...ctx.resolveText('body', { letterSpacing: 0.04 }), color: readableOn(onColor(ctx, accent), accent) }
    for (let ci = 0; ci < measured.length - 1; ci++) {
      const cx = measured[ci].colX + colWidth + gap / 2
      const dy = Math.max(0, (maxContentH - vsD) / 2)
      const lm = ctx.measureText(VS_LABEL, label, vsD)
      allChildren.push({ k: 'rect', box: { x: cx - vsD / 2, y: dy, width: vsD, height: vsD }, fill: { type: 'solid', color: accent }, radius: vsD / 2 } as LayoutNode)
      allChildren.push(...alignText([{ k: 'text', box: { x: cx - vsD / 2, y: dy + (vsD - lm.height) / 2, width: vsD, height: lm.height }, lines: lm.lines, style: label }], 'center'))
    }
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
