/**
 * tls.c.image-full — a full-bleed photo with a headline panel (AC6, ai-curation §2.3 rank 6).
 *
 * The photo covers the whole block (with the `full-bleed` slide layout: the whole slide, S13), a
 * scrim washes it (`medium` / `strong`), and the kicker, headline and one short paragraph sit on an
 * opaque panel: bottom-left (a card inset from the corner), left (a full-height side panel flush
 * with the edge) or center. The panel takes the deck surface's corners, edge and shadow
 * (`cardPaint`), but is always opaque: the photo's pixels are unknowable at layout time, so text
 * contrast is guaranteed by the panel, never by the photo.
 *
 * Built with `defineCompositeBlock` (`build()` = overlay of image, scrim and a card with a text
 * stack); `layout()` places the pieces by hand and flattens them (`composeFlat`, see `../_kit.ts`).
 * Pure: no document/window/Date.now/Math.random.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, LintContext, LintFinding, Paint } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { altFindings, str } from '../../media/_kit'
import { cardNodes, cardPaint, composeFlat, measureHeights, onSurface, pick, pickToken, plainOf, toMeasurable, type Piece } from '../_kit'
import { scrimColor } from '../tls-c-quote-image'

export interface ImageFullProps extends Record<string, unknown> {
  image: string
  alt: string
  kicker?: string
  title: string
  text?: string
  panel?: 'bottom-left' | 'left' | 'center'
  scrim?: 'medium' | 'strong'
}

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Photo', required: true },
  alt: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Photo alt text', required: true, guidance: '1-10 words describing the photo.' },
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  title: { type: { kind: 'richText', maxChars: 90 }, role: 'content', label: 'Headline', required: true, guidance: 'Up to 12 words.' },
  text: { type: { kind: 'text', maxChars: 200 }, role: 'content', label: 'Text', guidance: 'One or two short sentences.' },
  panel: enumSlot(['bottom-left', 'left', 'center'], 'Panel', 'Where the headline panel sits on the photo.'),
  scrim: enumSlot(['medium', 'strong'], 'Scrim', 'strong = darker wash for busy photos.'),
}

export const defaults: ImageFullProps = {
  image: '/demo/photo-2.svg',
  alt: 'A city skyline at dusk',
  kicker: 'Field visit',
  title: 'Where our customers work',
  text: 'Three days with the operations team in Da Nang.',
  panel: 'bottom-left',
  scrim: 'medium',
}

const PANELS = ['bottom-left', 'left', 'center'] as const
const SCRIMS = ['medium', 'strong'] as const
/** The wash over the photo is decoration (the panel carries contrast): lighter than quote-image's. */
const WASH = { medium: 0.18, strong: 0.38 } as const

const textSpecs = (props: ImageFullProps, size: 'display' | 'title' | 'heading' | 'subheading', on: Record<string, unknown>): BlockSpec[] =>
  [
    str(props.kicker).trim() ? { id: 'kicker', type: 'tls.t.kicker', props: { text: str(props.kicker), marker: false, ...on } } : undefined,
    { id: 'title', type: 'tls.t.title', props: { text: toMeasurable(props.title), size, ...on } },
    str(props.text).trim() ? { id: 'text', type: 'tls.t.body', props: { text: str(props.text), ...on } } : undefined,
  ].filter(Boolean) as BlockSpec[]

export function buildImageFull(props: ImageFullProps): BlockSpec {
  return {
    id: 'image-full',
    type: 'tls.l.overlay',
    props: {
      children: [
        { id: 'image', type: 'tls.m.image', props: { src: str(props.image), alt: str(props.alt) || plainOf(props.title), fit: 'cover' } },
        { id: 'scrim', type: 'tls.l.card', props: { padding: 'md', children: [], $block: { style: { surface: 'scrim' } } } },
        { id: 'panel', type: 'tls.l.card', props: { padding: 'xl', children: [{ id: 'text', type: 'tls.l.stack', props: { gap: 'md', sizing: 'content', children: textSpecs(props, 'title', {}) } }] } },
      ],
    },
  }
}

/** The panel's paint: the deck surface's look, always opaque (glass / ghost / outline get the surface fill). */
function panelPaint(ctx: LayoutContext) {
  const surface = ctx.resolveColor('surface').color
  const cp = cardPaint(ctx, { fill: { type: 'solid', color: surface } })
  const opaque = cp.fill && cp.fill.type === 'solid' && !/^rgba|transparent/i.test(cp.fill.color)
  const fill: Paint = opaque ? (cp.fill as Paint) : { type: 'solid', color: surface }
  return { ...cp, fill, topRule: undefined, surface: fill }
}

export function layoutImageFull(props: ImageFullProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const panel = pick(props.panel, PANELS, 'bottom-left')
  const level = pick(props.scrim, SCRIMS, 'medium')
  const sp = ctx.tokens.space
  const inset = sp['2xl']
  const pad = W >= 1200 ? sp['2xl'] : sp.xl
  const gap = sp.md
  const cp = panelPaint(ctx)
  const on = onSurface(cp.fill as Paint)
  // panel width by placement; its text column is the panel less its padding
  const pw = panel === 'left' ? Math.round(Math.min(W * 0.44, 900)) : panel === 'center' ? Math.round(Math.min(W - 2 * inset, Math.max(W * 0.56, 640), 1100)) : Math.round(Math.min(W - 2 * inset, Math.max(W * 0.46, 560), 900))
  const tw = Math.max(120, pw - 2 * pad)
  const align = panel === 'center' ? 'center' : 'start'
  const sizes: Array<'display' | 'title' | 'heading' | 'subheading'> = panel === 'left' ? ['title', 'heading', 'subheading'] : ['title', 'heading', 'subheading']
  const avail = (panel === 'left' ? H : H - 2 * inset) - 2 * pad
  // the biggest headline step whose text stack fits the panel's height (3 lines at most)
  let k = sizes.indexOf(pickToken(ctx, props.title, tw, sizes, 3) as (typeof sizes)[number])
  let specs = textSpecs(props, sizes[k], on)
  let hs = measureHeights(ctx, specs, tw)
  const stackH = () => hs.reduce((a, b) => a + b, 0) + gap * Math.max(0, hs.length - 1)
  while (stackH() > avail && k < sizes.length - 1) {
    k++
    specs = textSpecs(props, sizes[k], on)
    hs = measureHeights(ctx, specs, tw)
  }
  const sH = stackH()
  const ph = panel === 'left' ? Math.max(H, sH + 2 * pad) : Math.ceil(sH + 2 * pad)
  const total = Math.max(H, panel === 'left' ? ph : ph + 2 * inset)
  const px = panel === 'left' ? 0 : panel === 'center' ? Math.round((W - pw) / 2) : inset
  const py = panel === 'left' ? 0 : panel === 'center' ? Math.round((total - ph) / 2) : total - inset - ph

  const full = { x: 0, y: 0, width: W, height: total }
  const pieces: Piece[] = []
  pieces.push({ id: 'image', spec: { id: 'image', type: 'tls.m.image', props: { src: str(props.image), alt: str(props.alt) || plainOf(props.title), fit: 'cover' } }, box: full })
  const wash = scrimColor(ctx.resolveColor('scrim').color, level).replace(/[\d.]+\)$/, `${WASH[level]})`)
  pieces.push({ id: 'scrim', raw: [{ k: 'rect', box: full, fill: { type: 'solid', color: wash } } as LayoutNode], box: full })
  const radius = panel === 'left' ? 0 : ctx.tokens.radius.lg
  pieces.push({ id: 'panel', raw: cardNodes(cp, { x: px, y: py, width: pw, height: ph }, radius), box: { x: px, y: py, width: pw, height: ph } })
  let y = panel === 'left' ? Math.round((ph - sH) / 2) : py + pad
  specs.forEach((s, i) => {
    pieces.push({ id: s.id, spec: s, box: { x: px + pad, y, width: tw, height: hs[i] }, align })
    y += hs[i] + gap
  })
  return composeFlat(ctx, pieces, total)
}

export function lintImageFull(props: ImageFullProps, _ctx?: Partial<LintContext>): LintFinding[] {
  return altFindings([{ src: props.image, alt: props.alt, part: 'image' }])
}

const composite = defineCompositeBlock<ImageFullProps>({
  type: 'tls.c.image-full',
  name: 'Full-bleed photo',
  family: 'composite',
  tier: 'A',
  summary: 'A photo across the whole slide with a headline panel: bottom-left card, left side panel or centred.',
  keywords: ['full bleed', 'photo', 'image', 'hero image', 'background photo', 'headline', 'scene', 'location'],
  category: 'media',
  scope: 'slide',
  shortDescription: 'Full-slide photo with a headline panel',
  related: ['tls.c.quote-image', 'tls.c.image-text', 'tls.c.cover'],
  schema,
  defaults,
  size: { preferred: [1920, 1080], min: [960, 540] },
  describe: {
    when: 'A photo-led slide: a place, a product in use, a moment, with one headline and at most two sentences; use the full-bleed layout so the photo reaches the slide edges.',
    avoid: 'A quote over a photo: tls.c.quote-image. Photo beside a list: tls.c.image-text.',
    example: {
      id: 'b_image_full',
      type: 'tls.c.image-full',
      props: {
        image: '/demo/photo-2.svg',
        alt: 'A city skyline at dusk',
        kicker: 'Field visit',
        title: 'Where our customers work',
        text: 'Three days with the operations team in Da Nang.',
        panel: 'bottom-left',
        scrim: 'medium',
      },
    },
  },
  // the photo and wash fade in place, then the panel rises and its text follows in order
  motion: {
    parts: ['image', 'scrim', 'panel', 'kicker', 'title', 'text'],
    preset: 'fade-up',
    expressive: 'stagger-children',
    partMotion: { image: { preset: 'fade' }, scrim: { preset: 'fade' } },
  },
  build: buildImageFull,
})

export const tlsCImageFull: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: ImageFullProps, ctx: LayoutContext): LayoutNode => layoutImageFull(props, ctx)) as BlockDefinition['layout'],
  lint: ((props: ImageFullProps, ctx: LintContext): LintFinding[] => lintImageFull(props, ctx)) as BlockDefinition['lint'],
}
