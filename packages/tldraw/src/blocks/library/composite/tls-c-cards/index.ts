/**
 * tls.c.cards — a row of 2-4 equal cards, each led by an icon, number or image, then title and text.
 *
 * The Tier A, card-framed sibling of the Tier B `tls.c.feature-grid` (open cells, up to 6, icon only).
 * `defineCompositeBlock` supplies metadata and `build()` (a row of card > stack); `layout()` places the
 * same content by hand: a rounded rect per card (the card block has no stroke or radius) and
 * title/text/image pieces flattened to absolute leaves, so the tree stays 1 level deep and passes
 * DOM/SVG parity. Equal-height cards; content is top aligned.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode, Paint, Size } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { capacityOf } from '../../diagram/_kit'
import { iconLeaf } from '../../text/_engine/icon'
import { onColor } from '../../text/_engine/color'
import { objs, str } from '../../media/_kit'
import { composeFlat, measureHeights, onSurface, pick, type Piece } from '../_kit'

export const CARDS_MIN = 2
export const CARDS_MAX = 4

export interface CardItem {
  icon?: string
  number?: string
  image?: string
  title: string
  text?: string
}

export interface CardsProps extends Record<string, unknown> {
  cards: CardItem[]
  lead?: 'icon' | 'number' | 'image' | 'none'
  tone?: 'surface' | 'alt' | 'outline' | 'accent-first'
  align?: 'start' | 'center'
}

export const schema: BlockSchema = {
  cards: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
          number: { type: { kind: 'text', maxChars: 6 }, role: 'content', label: 'Number' },
          image: { type: { kind: 'image' }, role: 'content', label: 'Image' },
          title: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Title', required: true },
          text: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Text' },
        },
      },
      min: CARDS_MIN,
      max: CARDS_MAX,
    },
    role: 'content',
    label: 'Cards',
    required: true,
    guidance: 'Each: title!, text, and the field named by lead (icon, number or image).',
  },
  lead: enumSlot(['icon', 'number', 'image', 'none'], 'Lead', 'What tops each card.'),
  tone: enumSlot(['surface', 'alt', 'outline', 'accent-first'], 'Tone', 'accent-first fills only the first card.'),
  align: enumSlot(['start', 'center'], 'Alignment'),
}

export const defaults: CardsProps = {
  cards: [
    { icon: 'target', title: 'Clear goals', text: 'Every session starts from one question the data can answer.' },
    { icon: 'chart-bar', title: 'Hands-on data', text: 'Real datasets, small enough to explore in class.' },
    { icon: 'check', title: 'Honest results', text: 'Learn what a result does and does not show.' },
  ],
  lead: 'icon',
  tone: 'alt',
  align: 'start',
}

const LEADS = ['icon', 'number', 'image', 'none'] as const
const TONES = ['surface', 'alt', 'outline', 'accent-first'] as const

const itemsOf = (props: CardsProps): CardItem[] =>
  objs(props.cards)
    .filter((c) => str(c.title) !== '')
    .slice(0, CARDS_MAX)
    .map((c) => ({ icon: str(c.icon) || undefined, number: str(c.number) || undefined, image: str(c.image) || undefined, title: str(c.title), text: str(c.text) || undefined }))

/** The reference tree (a row of card > stack > leaves): 4 levels at most. Used for depth and measure checks. */
export function buildCards(props: CardsProps): BlockSpec {
  const lead = pick(props.lead, LEADS, 'icon')
  const cards: BlockSpec[] = itemsOf(props).map((c, i) => {
    const kids: BlockSpec[] = []
    if (lead === 'icon' && c.icon) kids.push({ id: `icon-${i}`, type: 'tls.m.icon', props: { icon: c.icon, color: 'accent' } })
    if (lead === 'number' && c.number) kids.push({ id: `number-${i}`, type: 'tls.t.title', props: { text: c.number, size: 'heading', color: 'accent' } })
    if (lead === 'image' && c.image) kids.push({ id: `image-${i}`, type: 'tls.m.image', props: { src: c.image, alt: c.title, fit: 'cover' } })
    kids.push({ id: `title-${i}`, type: 'tls.t.title', props: { text: c.title, size: 'subheading' } })
    if (c.text) kids.push({ id: `text-${i}`, type: 'tls.t.body', props: { text: c.text } })
    return { id: `card-${i}`, type: 'tls.l.card', props: { padding: 'lg', children: [{ id: `stack-${i}`, type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: kids } }] } }
  })
  return { id: 'cards', type: 'tls.l.row', props: { gap: 'lg', sizing: 'equal', children: cards } }
}

interface Plan {
  items: CardItem[]
  cw: number
  gap: number
  pad: number
  inner: number
  leadH: number
  titleH: number[]
  textH: number[]
  needed: number
}

function plan(props: CardsProps, ctx: LayoutContext): Plan {
  const items = itemsOf(props)
  const n = Math.max(1, items.length)
  const lead = pick(props.lead, LEADS, 'icon')
  const gap = ctx.tokens.space.lg
  const W = Math.max(0, ctx.box.width) || 0
  const cw = Math.max(0, (W - gap * (n - 1)) / n)
  // Padding shrinks with the card so a narrow region keeps its text width (RV03).
  const pad = Math.max(ctx.tokens.space.md, Math.min(n >= 4 ? ctx.tokens.space.lg : ctx.tokens.space.xl, Math.round(cw * 0.09)))
  const inner = Math.max(0, cw - 2 * pad)
  const hasLead = lead !== 'none' && items.some((c) => (lead === 'icon' ? c.icon : lead === 'number' ? c.number : c.image))
  const leadH = !hasLead ? 0 : lead === 'icon' ? 72 : lead === 'number' ? Math.round(ctx.tokens.type.heading.size * ctx.tokens.type.heading.lineHeight) : Math.min(260, Math.round(inner * 0.6))
  const titleH = measureHeights(ctx, items.map((c, i) => ({ id: `t${i}`, type: 'tls.t.title', props: { text: c.title, size: 'subheading' } })), inner)
  const textH = measureHeights(ctx, items.map((c, i) => ({ id: `x${i}`, type: n >= 4 ? 'tls.t.caption' : 'tls.t.body', props: { text: c.text ?? ' ' } })), inner)
  const sm = ctx.tokens.space.sm
  const body = Math.max(0, ...items.map((c, i) => titleH[i] + (c.text ? sm + textH[i] : 0)))
  const needed = 2 * pad + (leadH ? leadH + sm * 1.5 : 0) + body
  return { items, cw, gap, pad, inner, leadH, titleH, textH, needed }
}

/** Place the cards. Exported for tests. */
export function layoutCards(props: CardsProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const lead = pick(props.lead, LEADS, 'icon')
  const tone = pick(props.tone, TONES, 'alt')
  const center = props.align === 'center'
  const p = plan(props, ctx)
  const n = p.items.length
  const sm = ctx.tokens.space.sm
  // Cards hug their content with a little air; a tall region no longer stretches them to 460 (RV03).
  const total = Math.max(p.needed, Math.min(H, Math.round(p.needed * 1.3)))
  const accent = ctx.resolveColor('accent').color
  const pieces: Piece[] = []
  const small = n >= 4

  p.items.forEach((c, i) => {
    const x = i * (p.cw + p.gap)
    const filled = tone === 'accent-first' && i === 0
    const fillRole = tone === 'surface' ? 'surface' : 'surfaceAlt'
    const fillColor = filled ? accent : ctx.resolveColor(fillRole).color
    const fg = filled ? onColor(ctx, accent) : undefined
    const surf: Paint = { type: 'solid', color: tone === 'outline' ? ctx.resolveColor('surface').color : fillColor }
    const on = onSurface(surf)
    const col = fg ? { color: fg } : {}
    const bg: LayoutNode = {
      k: 'rect',
      box: { x, y: 0, width: p.cw, height: total },
      radius: ctx.tokens.radius.lg,
      ...(tone === 'outline'
        ? { stroke: { color: accent, width: 3 } }
        : tone === 'surface'
          ? { fill: surf, stroke: { color: ctx.resolveColor('line').color, width: 2 } }
          : { fill: surf }),
    } as LayoutNode
    pieces.push({ id: `card[${i}]`, raw: [bg], box: { x, y: 0, width: p.cw, height: total } })

    const ix = x + p.pad
    let y = p.pad
    const al = center ? 'center' : 'start'
    if (p.leadH) {
      const lbox = { x: ix, y, width: p.inner, height: p.leadH }
      if (lead === 'icon' && c.icon) {
        const size = 56
        pieces.push({ id: `lead[${i}]`, raw: [iconLeaf(c.icon, { x: center ? ix + (p.inner - size) / 2 : ix, y: y + (p.leadH - size) / 2, width: size, height: size }, fg ?? accent)], box: lbox })
      } else if (lead === 'number' && c.number) {
        pieces.push({ id: `lead[${i}]`, spec: { id: `number-${i}`, type: 'tls.t.title', props: { text: c.number, size: 'heading', color: fg ?? 'accent', ...on } }, box: lbox, align: al })
      } else if (lead === 'image' && c.image) {
        pieces.push({ id: `lead[${i}]`, spec: { id: `image-${i}`, type: 'tls.m.image', props: { src: c.image, alt: c.title, fit: 'cover' } }, box: lbox })
      }
      y += p.leadH + sm * 1.5
    }
    pieces.push({ id: `title[${i}]`, spec: { id: `title-${i}`, type: 'tls.t.title', props: { text: c.title, size: 'subheading', ...col, ...on } }, box: { x: ix, y, width: p.inner, height: p.titleH[i] }, align: al })
    y += p.titleH[i] + sm
    if (c.text) {
      pieces.push({
        id: `text[${i}]`,
        spec: { id: `text-${i}`, type: small ? 'tls.t.caption' : 'tls.t.body', props: { text: c.text, ...(fg ? { color: fg } : {}), ...on } },
        box: { x: ix, y, width: p.inner, height: p.textH[i] },
        align: al,
      })
    }
  })
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<CardsProps>({
  type: 'tls.c.cards',
  name: 'Cards',
  family: 'composite',
  tier: 'A',
  summary: 'Row of 2-4 equal cards, each led by an icon, number or image, then title and text.',
  keywords: ['cards', 'pillars', 'benefits', 'offerings', 'three columns', 'features', 'icon cards'],
  category: 'list',
  scope: 'group',
  shortDescription: 'Row of equal cards, each led by an icon, number or image, then title and text',
  related: ['tls.c.feature-grid', 'tls.t.bullets', 'tls.c.case-study'],
  schema,
  defaults,
  size: { preferred: [1500, 400], min: [1320, 400] },
  describe: {
    when: 'Two to four framed pillars, benefits or offerings in a row, each with an icon (or number/image), a title and a one-sentence paragraph.',
    avoid: 'More than 4 items or icon-only entries: tls.c.feature-grid. Plain points: tls.t.bullets.',
    example: {
      id: 'b_cards',
      type: 'tls.c.cards',
      props: {
        cards: [
          { icon: 'target', title: 'Clear goals', text: 'Every session starts from one question the data can answer.' },
          { icon: 'chart-bar', title: 'Hands-on data', text: 'Real datasets, small enough to explore in class.' },
          { icon: 'check', title: 'Honest results', text: 'Learn what a result does and does not show.' },
        ],
        lead: 'icon',
      },
    },
  },
  motion: { parts: ['root'], preset: 'stagger-grid' },
  build: buildCards,
})

function capacity(props: CardsProps): CapacityReport {
  const used = Array.isArray(props.cards) ? props.cards.length : 0
  return capacityOf({ cards: { max: CARDS_MAX, used } }, true, [{ kind: 'truncate', slot: 'cards' }, { kind: 'paginate' }])
}

export const tlsCCards: BlockDefinition = {
  ...composite,
  layout: ((props: CardsProps, ctx: LayoutContext): LayoutNode => layoutCards(props, ctx)) as BlockDefinition['layout'],
  /** Natural height at the given width: what the tallest card needs. */
  intrinsicSize: ((props: CardsProps, ctx: LayoutContext): Size => ({
    width: Math.max(0, ctx.box.width),
    height: Math.max(1, Math.ceil(plan(props, ctx).needed)),
  })) as BlockDefinition['intrinsicSize'],
  capacity: capacity as BlockDefinition['capacity'],
}
