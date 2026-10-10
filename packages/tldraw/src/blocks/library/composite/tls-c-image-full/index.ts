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
import { parseScrim, scrimColor } from '../tls-c-quote-image'
import { lumOf } from '../../text/_engine/color'

export interface ImageFullProps extends Record<string, unknown> {
  image: string
  alt: string
  kicker?: string
  title: string
  text?: string
  panel?: 'bottom-left' | 'left' | 'center' | 'right' | 'split' | 'band'
  scrim?: 'medium' | 'strong' | 'gradient'
  /** AC8: the photo inset from the slide edge (a mat around it), corners rounded. */
  frame?: boolean
}

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Photo', required: true },
  alt: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Photo alt text', required: true, guidance: '1-10 words describing the photo.' },
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  title: { type: { kind: 'richText', maxChars: 90 }, role: 'content', label: 'Headline', required: true, guidance: 'Up to 12 words.' },
  text: { type: { kind: 'text', maxChars: 200 }, role: 'content', label: 'Text', guidance: 'One or two short sentences.' },
  panel: enumSlot(['bottom-left', 'left', 'center', 'right', 'split', 'band'], 'Panel', 'Card (bottom-left, center), side panel (left, right), split beside the photo, band at the foot.'),
  scrim: enumSlot(['medium', 'strong', 'gradient'], 'Scrim', 'strong = darker; gradient = text on a dark fade.'),
  frame: { type: { kind: 'boolean' }, role: 'option', label: 'Frame', help: 'Photo inset, rounded.' },
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
const AC8_PANELS = ['bottom-left', 'left', 'center', 'right', 'split', 'band'] as const
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
  // AC8: the new panels, the gradient scrim and the frame take their own path; the AC6 looks are
  // laid out below exactly as before.
  if (props.frame === true || props.scrim === 'gradient' || props.panel === 'right' || props.panel === 'split' || props.panel === 'band') return layoutImageFullV2(props, ctx)
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

/** `#rrggbb` of an rgb triple. */
const hex = (rgb: [number, number, number]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * AC8 (`reviews/blocks/ai-curation/README.md` §8, lead review "the panel is the same in every
 * style"): `right` (a full-height side panel on the right), `split` (the photo on the left 56 %,
 * a solid panel beside it, no overlap), `band` (a strip across the foot: headline left, text right),
 * `scrim: gradient` (no card: the text sits on a dark fade from the panel's side; contrast is the
 * fade's, solved white-or-dark) and `frame` (the photo inset by `xl` with rounded corners).
 */
function layoutImageFullV2(props: ImageFullProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const panel = pick(props.panel, AC8_PANELS, 'bottom-left')
  const gradient = props.scrim === 'gradient' && panel !== 'split'
  const level = props.scrim === 'strong' ? 'strong' : 'medium'
  const sp = ctx.tokens.space
  const F = props.frame === true ? (W >= 1200 ? sp.xl : sp.md) : 0
  const inset = sp['2xl']
  const pad = W >= 1200 ? sp['2xl'] : sp.xl
  const gap = sp.md
  const cp = panelPaint(ctx)
  const scrimBase = parseScrim(ctx.resolveColor('scrim').color)
  const dark = hex(scrimBase.rgb)
  // on the fade the text is set in a literal light (or dark) ink: the solver would only nudge the
  // theme's text colour along its hue (navy became a mid blue on the dark fade)
  const lightInk = lumOf(dark) < 0.4
  const on = gradient ? { $block: { style: { surface: { type: 'solid', color: dark }, on: lightInk ? '#FFFFFF' : '#111111' } } } : onSurface(cp.fill as Paint)
  const pw0 = W - 2 * F
  // the text column per panel
  const side = panel === 'left' || panel === 'right'
  const split = panel === 'split'
  const band = panel === 'band'
  const photoW = split ? Math.round(pw0 * 0.56) : pw0
  const pw = side ? Math.round(Math.min(pw0 * 0.44, 900)) : split ? pw0 - photoW - (F ? F : 0) : band ? pw0 : panel === 'center' ? Math.round(Math.min(pw0 - 2 * inset, Math.max(pw0 * 0.56, 640), 1100)) : Math.round(Math.min(pw0 - 2 * inset, Math.max(pw0 * 0.46, 560), 900))
  const align = panel === 'center' ? 'center' : 'start'
  const sizes: Array<'title' | 'heading' | 'subheading'> = ['title', 'heading', 'subheading']
  // band: headline column (58 %) and text column side by side
  // AC8.5: 0.66 (was 0.58) and 4 lines in a full-height column (was 3): a band or split headline
  // fell to heading size under a large title token (gradient, swiss, memphis) and read small.
  const headW = band ? Math.round((pw - 2 * pad) * 0.66) : pw - 2 * pad
  const textW = band ? pw - 2 * pad - headW - sp.xl : headW
  const fullTall = side || split
  const avail = (fullTall ? H - 2 * F : (H - 2 * F) * (band ? 0.5 : 1) - 2 * inset) - 2 * pad
  let k = sizes.indexOf(pickToken(ctx, props.title, Math.max(120, headW), sizes, side || split ? 4 : 3) as (typeof sizes)[number])
  const specsAt = (i: number) => textSpecs(props, sizes[i], on)
  let specs = specsAt(k)
  const headSpecs = () => (band ? specs.filter((s) => s.id !== 'text') : specs)
  const bodySpecs = () => (band ? specs.filter((s) => s.id === 'text') : [])
  let hs = measureHeights(ctx, headSpecs(), Math.max(120, headW))
  let bs = measureHeights(ctx, bodySpecs(), Math.max(120, textW))
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0) + gap * Math.max(0, a.length - 1)
  const stackH = () => Math.max(sum(hs), sum(bs))
  while (stackH() > avail && k < sizes.length - 1) {
    k++
    specs = specsAt(k)
    hs = measureHeights(ctx, headSpecs(), Math.max(120, headW))
    bs = measureHeights(ctx, bodySpecs(), Math.max(120, textW))
  }
  const sH = stackH()
  const ph = fullTall ? H - 2 * F : Math.ceil(sH + 2 * pad)
  const total = Math.max(H, fullTall ? ph + 2 * F : ph + 2 * F + (band ? 0 : 2 * inset))
  const innerH = total - 2 * F
  const px = panel === 'left' ? F : panel === 'right' ? W - F - pw : split ? F + photoW + (F ? F : 0) : band ? F : panel === 'center' ? Math.round((W - pw) / 2) : F + inset
  const py = fullTall ? F : band ? total - F - ph : panel === 'center' ? Math.round((total - ph) / 2) : total - F - inset - ph
  const radius = F ? ctx.tokens.radius.lg : 0
  const photo = { x: F, y: F, width: photoW, height: innerH }
  const pieces: Piece[] = []
  pieces.push({ id: 'image', spec: { id: 'image', type: 'tls.m.image', props: { src: str(props.image), alt: str(props.alt) || plainOf(props.title), fit: 'cover', ...(radius ? { radius } : {}) } }, box: photo })
  if (gradient) {
    // a fade from the text side: dark (the scrim colour at 0.86) to clear. CMP2 (`contrast/low`,
    // P8/P11): the dark part holds over the whole text column — at ≥ 0.62 where the text ends, so
    // light ink reads on any photo (over white the fade is a mid grey ≥ 4.5:1) — and only then fades
    // out (before, 0.5 at 42 % of the photo left the top lines of a tall title at ~0.4 alpha).
    const a = (x: number) => `rgba(${scrimBase.rgb.join(',')},${x})`
    const angle = panel === 'left' ? 90 : panel === 'right' ? 270 : 0
    const textEnd =
      panel === 'left'
        ? (px + pad + headW - photo.x) / Math.max(1, photo.width)
        : panel === 'right'
          ? 1 - (px + pad - photo.x) / Math.max(1, photo.width)
          : 1 - (py + pad - photo.y) / Math.max(1, photo.height)
    const hold = Math.min(0.94, Math.max(0.42, textEnd + 0.04))
    const stops = [{ color: a(0.86), at: 0 }, { color: a(0.62), at: panel === 'center' ? 0.5 : hold }, { color: a(0), at: panel === 'center' ? 1 : Math.min(1, Math.max(0.8, hold + 0.3)) }]
    const fill: Paint = panel === 'center' ? { type: 'solid', color: a(0.58) } : ({ type: 'linearGradient', angle, stops } as Paint)
    pieces.push({ id: 'scrim', raw: [{ k: 'rect', box: photo, fill, ...(radius ? { radius } : {}) } as LayoutNode], box: photo })
  } else {
    const wash = scrimColor(ctx.resolveColor('scrim').color, level).replace(/[\d.]+\)$/, `${WASH[level]})`)
    pieces.push({ id: 'scrim', raw: [{ k: 'rect', box: photo, fill: { type: 'solid', color: wash }, ...(radius ? { radius } : {}) } as LayoutNode], box: photo })
    const pr = side || split ? (F ? radius : 0) : band ? (F ? [0, 0, radius, radius] : 0) : ctx.tokens.radius.lg
    pieces.push({ id: 'panel', raw: cardNodes(cp, { x: px, y: py, width: pw, height: ph }, pr), box: { x: px, y: py, width: pw, height: ph } })
  }
  // text: centred in a full-height panel, from the top padding otherwise; band: two columns
  let y = fullTall ? py + Math.round((ph - sum(hs)) / 2) : py + pad
  if (band) y = py + Math.round((ph - sum(hs)) / 2)
  headSpecs().forEach((s, i) => {
    pieces.push({ id: s.id, spec: s, box: { x: px + pad, y, width: headW, height: hs[i] }, align })
    y += hs[i] + gap
  })
  if (band) {
    let by = py + Math.round((ph - sum(bs)) / 2)
    bodySpecs().forEach((s, i) => {
      pieces.push({ id: s.id, spec: s, box: { x: px + pad + headW + sp.xl, y: by, width: textW, height: bs[i] } })
      by += bs[i] + gap
    })
  }
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
  summary: 'A photo across the slide with a headline on a card, a side panel, split, a band or a dark fade.',
  keywords: ['full bleed', 'photo', 'image', 'hero image', 'background photo', 'headline', 'scene', 'location'],
  category: 'media',
  scope: 'slide',
  shortDescription: 'Full-slide photo with a headline panel',
  related: ['tls.c.quote-image', 'tls.c.image-text', 'tls.c.cover'],
  schema,
  defaults,
  size: { preferred: [1920, 1080], min: [960, 540] },
  describe: {
    when: 'A photo-led slide (a place, a product in use, a moment) with one headline and at most two sentences; use the full-bleed layout.',
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
