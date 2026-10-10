/**
 * tls.c.bento — 3 to 5 tiles in an asymmetric grid (AC6, ai-curation §2.3 rank 5): the signature
 * layout of the Modern & Digital styles. Each tile is a `stat` (big number + label), a `point`
 * (icon, title, one sentence), an `image` (a photo filling the tile) or a `quote` (a short quote and
 * a name). `pattern` arranges them:
 *
 *   `1+2`    one big tile on the left, two stacked on the right (3 tiles)
 *   `2+1`    two stacked on the left, one big tile on the right (3 tiles)
 *   `hero+3` a hero tile on the left half; on the right one wide tile over two small ones (4 tiles)
 *   `3+2`    a row of three over a row of two, unequal widths (5 tiles)
 *
 * A pattern with more slots than tiles falls back to the pattern for that many tiles; tiles past
 * the pattern's slots are dropped (capacity reports it). Every tile takes the deck surface
 * (`cardPaint`); the first `stat` tile is filled with the accent as the grid's anchor. Each tile
 * picks the biggest type step its content fits at. Built with `defineCompositeBlock`; `layout()`
 * places and flattens the pieces (`composeFlat`). Pure: no document/window/Date.now/Math.random.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, Box, CapacityReport, LayoutContext, LayoutNode, LintContext, LintFinding, Paint } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { capacityOf } from '../../data/_chart/kit'
import { altFindings, objs, str } from '../../media/_kit'
import { onColor, tintOf } from '../../text/_engine/color'
import { iconLeaf } from '../../text/_engine/icon'
import { scaledGlyphPath } from '../../text/tls-t-quote/layout'
import { cardNodes, cardPaint, composeFlat, measureHeights, onSurface, pick, pickToken, plainOf, toMeasurable, type Piece } from '../_kit'

export type BentoKind = 'stat' | 'point' | 'image' | 'quote'
export interface BentoTile {
  kind?: BentoKind
  value?: string
  label?: string
  icon?: string
  title?: string
  text?: string
  image?: string
  alt?: string
  quote?: string
  name?: string
}
export type BentoPattern = '1+2' | '2+1' | 'hero+3' | '3+2'
export interface BentoProps extends Record<string, unknown> {
  tiles: BentoTile[]
  pattern?: BentoPattern
}

export const BENTO_MIN = 3
export const BENTO_MAX = 5
const KINDS = ['stat', 'point', 'image', 'quote'] as const
const PATTERNS = ['1+2', '2+1', 'hero+3', '3+2'] as const
const SLOTS: Record<BentoPattern, number> = { '1+2': 3, '2+1': 3, 'hero+3': 4, '3+2': 5 }

export const schema: BlockSchema = {
  tiles: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          kind: { type: { kind: 'enum', values: [...KINDS] }, role: 'content', label: 'Kind', guidance: 'stat, point, image or quote.' },
          value: { type: { kind: 'text', maxChars: 10 }, role: 'content', label: 'Value', guidance: 'stat: the number, e.g. 42%.' },
          label: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Label', guidance: 'stat: what the number counts.' },
          icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
          title: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Title' },
          text: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Text' },
          image: { type: { kind: 'image' }, role: 'content', label: 'Image' },
          alt: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Alt text' },
          quote: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Quote' },
          name: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Name' },
        },
      },
      min: BENTO_MIN,
      max: BENTO_MAX,
    },
    role: 'content',
    label: 'Tiles',
    required: true,
    guidance: 'Each: kind, then stat value+label; point icon+title+text; image image+alt; quote quote+name.',
  },
  pattern: enumSlot([...PATTERNS], 'Pattern', '1+2 / 2+1 = 3 tiles, hero+3 = 4, 3+2 = 5.'),
}

export const defaults: BentoProps = {
  tiles: [
    { kind: 'stat', value: '42%', label: 'revenue growth in one year' },
    { kind: 'point', icon: 'users', title: 'Teams, not users', text: 'Most new seats come from teams adding colleagues.' },
    { kind: 'point', icon: 'target', title: 'Mid-market gap', text: 'Firms of 200 to 2,000 people have no clear choice.' },
    { kind: 'quote', quote: 'We buy tools for the whole team now.', name: 'Linh Pham, COO' },
  ],
  pattern: 'hero+3',
}

interface Tile extends BentoTile {
  kind: BentoKind
}

const tilesOf = (props: BentoProps): Tile[] =>
  objs(props.tiles)
    .slice(0, BENTO_MAX)
    .map((t) => ({ ...(t as BentoTile), kind: pick(t.kind, KINDS, 'point') }))
    .filter((t) => (t.kind === 'stat' ? str(t.value) : t.kind === 'image' ? str(t.image) : t.kind === 'quote' ? str(t.quote) : str(t.title) || str(t.text)))

/** The pattern actually drawn for `n` tiles. */
export function patternFor(pattern: BentoPattern, n: number): BentoPattern {
  if (n >= SLOTS[pattern]) return pattern
  return n >= 5 ? '3+2' : n === 4 ? 'hero+3' : pattern === '2+1' ? '2+1' : '1+2'
}

/** The tile boxes of a pattern in a W × H box with gap `g`. */
export function bentoCells(pattern: BentoPattern, W: number, H: number, g: number): Box[] {
  const r = (x: number, y: number, w: number, h: number): Box => ({ x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) })
  const half = (H - g) / 2
  if (pattern === '1+2' || pattern === '2+1') {
    const big = (W - g) * 0.58
    const small = W - g - big
    const bx = pattern === '1+2' ? 0 : small + g
    const sx = pattern === '1+2' ? big + g : 0
    const bigCell = r(bx, 0, big, H)
    const smalls = [r(sx, 0, small, half), r(sx, half + g, small, half)]
    return pattern === '1+2' ? [bigCell, ...smalls] : [...smalls, bigCell]
  }
  if (pattern === 'hero+3') {
    const hw = (W - g) * 0.5
    const rx = hw + g
    const rw = W - rx
    const sw = (rw - g) / 2
    return [r(0, 0, hw, H), r(rx, 0, rw, half), r(rx, half + g, sw, half), r(rx + sw + g, half + g, sw, half)]
  }
  // 3+2: [0.4, 0.3, 0.3] over [0.35, 0.65] of the row width less its gaps
  const top = W - 2 * g
  const bot = W - g
  const a = [top * 0.4, top * 0.3, top * 0.3]
  const b = [bot * 0.35, bot * 0.65]
  return [r(0, 0, a[0], half), r(a[0] + g, 0, a[1], half), r(a[0] + a[1] + 2 * g, 0, a[2], half), r(0, half + g, b[0], half), r(b[0] + g, half + g, b[1], half)]
}

type Step = 'display' | 'title' | 'heading' | 'subheading' | 'body'

/** The specs of a tile's text, at headline step `s`. */
function tileSpecs(t: Tile, s: Step, on: Record<string, unknown>, ink?: string): BlockSpec[] {
  const col = ink ? { color: ink } : {}
  // the last step sets the headline as body text (a long quote in a small tile)
  const title = (id: string, text: string, color?: string): BlockSpec =>
    s === 'body'
      ? { id, type: 'tls.t.body', props: { text: plainOf(text), ...(color ? { color } : col), ...on } }
      : { id, type: 'tls.t.title', props: { text: toMeasurable(text), size: s, ...(color ? { color } : col), ...on } }
  // the small text: body beside a big headline, caption once the headline is at subheading or below
  const small = (id: string, text: string): BlockSpec => ({ id, type: s === 'subheading' || s === 'body' ? 'tls.t.caption' : 'tls.t.body', props: { text, ...(ink ? { color: ink } : {}), ...on } })
  if (t.kind === 'stat') return [title('value', str(t.value), ink ?? 'accent'), ...(str(t.label) ? [small('label', str(t.label))] : [])]
  if (t.kind === 'quote') return [title('quote', str(t.quote)), ...(str(t.name) ? [small('name', str(t.name))] : [])]
  return [...(str(t.title) ? [title('title', str(t.title))] : []), ...(str(t.text) ? [small('text', str(t.text))] : [])]
}

/** Headline steps each kind starts from, biggest first. */
const START: Record<'point' | 'quote', Step[]> = {
  point: ['heading', 'subheading', 'body'],
  quote: ['heading', 'subheading', 'body'],
}

/** Inner box and text room of a tile (as `layoutBento` lays it out: padding, icon disc, quote mark). */
function tileRoom(t: Tile, c: Box, ctx: LayoutContext): { inner: Box; room: number } {
  const pad = Math.round(Math.max(ctx.tokens.space.md, Math.min(ctx.tokens.space['2xl'], Math.min(c.width, c.height) * 0.1)))
  const inner = { x: c.x + pad, y: c.y + pad, width: Math.max(1, c.width - 2 * pad), height: Math.max(1, c.height - 2 * pad) }
  let room = inner.height
  if (t.kind === 'point' && str(t.icon)) room -= Math.round(Math.max(56, Math.min(112, Math.min(c.width, c.height) * 0.26))) + ctx.tokens.space.md
  if (t.kind === 'quote') {
    const mw = Math.round(Math.max(40, Math.min(72, c.height * 0.16)))
    room -= mw * 0.8 + ctx.tokens.space.sm
  }
  return { inner, room }
}

/** The ladder step a text tile's own text fits at (biggest first). */
function tileStep(t: Tile, c: Box, ctx: LayoutContext): number {
  const { inner, room } = tileRoom(t, c, ctx)
  const ladder = START[t.kind as 'point' | 'quote']
  const headline = t.kind === 'quote' ? str(t.quote) : str(t.title)
  let k = Math.max(0, ladder.indexOf(pickToken(ctx, headline, inner.width, ladder, 3) as Step))
  const gap = ctx.tokens.space.sm
  const total = (specs: BlockSpec[]) => {
    const hs = measureHeights(ctx, specs, inner.width)
    return hs.reduce((a, b) => a + b, 0) + gap * Math.max(0, hs.length - 1)
  }
  // the tile's on-surface style does not change text height
  while (total(tileSpecs(t, ladder[k], {})) > room && k < ladder.length - 1) k++
  return k
}

export function layoutBento(props: BentoProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const tiles = tilesOf(props)
  const pattern = patternFor(pick(props.pattern, PATTERNS, 'hero+3'), tiles.length)
  const g = ctx.tokens.space.lg
  const cells = bentoCells(pattern, W, H, g)
  const used = tiles.slice(0, cells.length)
  const accent = ctx.resolveColor('accent').color
  const radius = ctx.tokens.radius.lg
  const firstStat = used.findIndex((t) => t.kind === 'stat')
  // the biggest step whose text fits each text tile's room, then the smallest of those for all
  const sharedStep = used.reduce((most, t, i) => (t.kind === 'point' || t.kind === 'quote' ? Math.max(most, tileStep(t, cells[i], ctx)) : most), 0)
  const pieces: Piece[] = []
  used.forEach((t, i) => {
    const c = cells[i]
    const pad = Math.round(Math.max(ctx.tokens.space.md, Math.min(ctx.tokens.space['2xl'], Math.min(c.width, c.height) * 0.1)))
    const inner = { x: c.x + pad, y: c.y + pad, width: Math.max(1, c.width - 2 * pad), height: Math.max(1, c.height - 2 * pad) }
    if (t.kind === 'image') {
      pieces.push({ id: `tile[${i}]`, spec: { id: `image-${i}`, type: 'tls.m.image', props: { src: str(t.image), alt: str(t.alt) || str(t.title), fit: 'cover', radius } }, box: c })
      return
    }
    const anchor = i === firstStat
    const cp = anchor ? { fill: { type: 'solid', color: accent } as Paint, surface: { type: 'solid', color: accent } as Paint, styled: true } : cardPaint(ctx, { fill: { type: 'solid', color: ctx.resolveColor('surfaceAlt').color } })
    pieces.push({ id: `tile[${i}]`, raw: cardNodes(cp, c, radius), box: c })
    const on = onSurface(cp.surface)
    const ink = anchor ? onColor(ctx, accent) : undefined
    // icon (point): a tinted disc at the top left
    let top = inner.y
    let room = inner.height
    if (t.kind === 'point' && str(t.icon)) {
      const disc = Math.round(Math.max(56, Math.min(112, Math.min(c.width, c.height) * 0.26)))
      const glyph = Math.round(disc * 0.56)
      const bg = tintOf(ctx.resolveColor('surfaceAlt').color, accent, 0.18)
      pieces.push({
        id: `icon[${i}]`,
        raw: [
          { k: 'rect', box: { x: inner.x, y: inner.y, width: disc, height: disc }, fill: { type: 'solid', color: bg }, radius: disc / 2 } as LayoutNode,
          iconLeaf(t.icon, { x: inner.x + (disc - glyph) / 2, y: inner.y + (disc - glyph) / 2, width: glyph, height: glyph }, accent),
        ],
        box: { x: inner.x, y: inner.y, width: disc, height: disc },
      })
      top += disc + ctx.tokens.space.md
      room -= disc + ctx.tokens.space.md
    }
    // quote: the curly mark at the top left
    if (t.kind === 'quote') {
      const mw = Math.round(Math.max(40, Math.min(72, c.height * 0.16)))
      pieces.push({
        id: `mark[${i}]`,
        raw: [{ k: 'path', box: { x: 0, y: 0, width: W, height: H }, d: scaledGlyphPath(mw / 100, inner.x, inner.y), fill: { type: 'solid', color: ink ?? accent } } as LayoutNode],
        box: { x: inner.x, y: inner.y, width: mw, height: mw * 0.8 },
      })
      top += mw * 0.8 + ctx.tokens.space.sm
      room -= mw * 0.8 + ctx.tokens.space.sm
    }
    // a stat's number is set as large as the tile allows (≤ 2× display), the label under it at lead
    // or body: a bento's anchor tile reads as one big figure, not a heading in a big box
    if (t.kind === 'stat') {
      const gap = ctx.tokens.space.sm
      const big = c.height >= 360 && c.width >= 480
      const label: BlockSpec | undefined = str(t.label) ? { id: 'label', type: 'tls.t.body', props: { text: str(t.label), ...(ink ? { color: ink } : {}), ...on } } : undefined
      const lh = label ? measureHeights(ctx, [label], inner.width)[0] : 0
      const base = ctx.resolveText('display')
      const lead = base.lineHeight
      // the label keeps a gap of 10 % of the number's size: a serif with old-style figures (Playfair's
      // descending 4) otherwise touches it
      const GAP_EM = label ? 0.1 : 0
      let size = Math.min(base.size * (big ? 2 : 1), (room - lh - (label ? gap : 0)) / (lead + GAP_EM))
      const fits = (sz: number) => ctx.measureText(str(t.value), { ...base, size: sz }, 1e6).width <= inner.width
      while (size > ctx.resolveText('subheading').size && !fits(size)) size *= 0.94
      size = Math.max(ctx.resolveText('subheading').size, Math.floor(size))
      const style = { ...base, size, color: ink ?? accent }
      const m = ctx.measureText(str(t.value), style, inner.width)
      const under = gap + Math.round(size * GAP_EM)
      let y = Math.max(top, inner.y + inner.height - (m.height + (label ? under + lh : 0)))
      pieces.push({ id: `value[${i}]`, raw: [{ k: 'text', box: { x: inner.x, y, width: inner.width, height: m.height }, lines: m.lines, style } as LayoutNode], box: { x: inner.x, y, width: inner.width, height: m.height } })
      y += m.height + under
      if (label) pieces.push({ id: `label[${i}]`, spec: label, box: { x: inner.x, y, width: inner.width, height: lh } })
      return
    }
    // CMP2 (P4/P5): every text tile takes the same step — the smallest any of them needs — so peer
    // tiles share one headline size and one small size (a slide carried 6 text sizes)
    const ladder = START[t.kind as 'point' | 'quote']
    const k = sharedStep
    const specs = tileSpecs(t, ladder[k], on, ink)
    const gap = ctx.tokens.space.sm
    const hs = measureHeights(ctx, specs, inner.width)
    const total = () => hs.reduce((a, b) => a + b, 0) + gap * Math.max(0, hs.length - 1)
    // stat and point text sits at the foot of the tile, a quote under its mark
    let y = t.kind === 'quote' ? top : Math.max(top, inner.y + inner.height - total())
    specs.forEach((s, j) => {
      pieces.push({ id: `${s.id}[${i}]`, spec: s, box: { x: inner.x, y, width: inner.width, height: hs[j] } })
      y += hs[j] + gap
    })
  })
  return composeFlat(ctx, pieces, H)
}

export function buildBento(props: BentoProps): BlockSpec {
  const tiles = tilesOf(props)
  const kids: BlockSpec[] = tiles.map((t, i) => ({
    id: `tile-${i}`,
    type: 'tls.l.card',
    props: {
      padding: 'lg',
      children:
        t.kind === 'image'
          ? [{ id: `image-${i}`, type: 'tls.m.image', props: { src: str(t.image), alt: str(t.alt) || 'Photo', fit: 'cover' } }]
          : [{ id: `text-${i}`, type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: tileSpecs(t, 'heading', {}) } }],
    },
  }))
  return { id: 'bento', type: 'tls.l.grid', props: { columns: 3, rows: 2, gap: 'lg', children: kids } }
}

function capacity(props: BentoProps): CapacityReport {
  const used = Array.isArray(props.tiles) ? props.tiles.length : 0
  const slots = SLOTS[pick(props.pattern, PATTERNS, 'hero+3')]
  return capacityOf({ tiles: { max: Math.max(slots, BENTO_MIN), used } }, true, [{ kind: 'truncate', slot: 'tiles' }, { kind: 'paginate' }])
}

export function lintBento(props: BentoProps, _ctx?: Partial<LintContext>): LintFinding[] {
  return altFindings(tilesOf(props).filter((t) => t.kind === 'image').map((t, i) => ({ src: t.image, alt: t.alt, part: `tile[${i}]` })))
}

const composite = defineCompositeBlock<BentoProps>({
  type: 'tls.c.bento',
  name: 'Bento grid',
  family: 'composite',
  tier: 'A',
  summary: 'Three to five tiles in an asymmetric grid, each a stat, an icon point, a photo or a quote.',
  keywords: ['bento', 'grid', 'tiles', 'mosaic', 'highlights', 'overview', 'at a glance', 'mixed'],
  category: 'list',
  scope: 'slide',
  shortDescription: 'Asymmetric tile grid: a big stat, icon points, a photo, a quote',
  related: ['tls.c.cards', 'tls.c.feature-grid', 'tls.c.kpi-row'],
  schema,
  defaults,
  size: { preferred: [1728, 760], min: [1200, 560] },
  describe: {
    when: 'An at-a-glance overview that mixes kinds: one headline number, two or three points, a photo or a short quote, on one slide.',
    avoid: 'Same-kind items in a row: tls.c.cards or tls.c.feature-grid. Only numbers: tls.c.kpi-row.',
    example: {
      id: 'b_bento',
      type: 'tls.c.bento',
      props: {
        tiles: [
          { kind: 'stat', value: '42%', label: 'revenue growth in one year' },
          { kind: 'point', icon: 'users', title: 'Teams, not users', text: 'Most new seats come from teams adding colleagues.' },
          { kind: 'point', icon: 'target', title: 'Mid-market gap', text: 'Firms of 200 to 2,000 people have no clear choice.' },
          { kind: 'quote', quote: 'We buy tools for the whole team now.', name: 'Linh Pham, COO' },
        ],
        pattern: 'hero+3',
      },
    },
  },
  // the tiles stagger in, then each tile's content follows
  motion: { parts: ['tile[*]', 'icon[*]', 'mark[*]', 'value[*]', 'label[*]', 'title[*]', 'text[*]', 'quote[*]', 'name[*]'], preset: 'stagger-grid' },
  build: buildBento,
})

export const tlsCBento: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: BentoProps, ctx: LayoutContext): LayoutNode => layoutBento(props, ctx)) as BlockDefinition['layout'],
  capacity: capacity as BlockDefinition['capacity'],
  lint: ((props: BentoProps, ctx: LintContext): LintFinding[] => lintBento(props, ctx)) as BlockDefinition['lint'],
}
