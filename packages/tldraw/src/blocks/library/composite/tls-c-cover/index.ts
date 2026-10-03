/**
 * tls.c.cover — title slide: kicker, title, subtitle, meta line, optional logo, centred, split with a
 * photo, or full-bleed over a photo.
 *
 * Built with `defineCompositeBlock` (`build()` is the content stack: logo, kicker, title, subtitle,
 * meta). The generated `layout()` is replaced by one that places those same specs by hand with
 * `ctx.layoutChild` and flattens them to absolute leaves, because (1) the text blocks ignore `align`
 * so a centred cover has to centre lines itself, (2) a content-sized stack scales its children to
 * fill a tall region, and (3) nested layoutChild wrappers fail DOM/SVG parity. The tree is 2 deep.
 *
 * Reduced vs the plan: the logo is placed at the top start (centre for `centered`) in a fixed box,
 * and `bleed` without an image falls back to an accent field.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { onColor } from '../../text/_engine/color'
import { composeFlat, measureHeights, onSurface, pick, pickToken, plainOf, toMeasurable, SCRIM_SURFACE, type Piece } from '../_kit'

export interface CoverProps extends Record<string, unknown> {
  kicker?: string
  title: string
  subtitle?: string
  meta?: string
  image?: string
  alt?: string
  logo?: string
  variant?: 'centered' | 'split' | 'bleed'
  decoration?: 'none' | 'blob' | 'arc' | 'dots'
  showKicker?: boolean
  showSubtitle?: boolean
  showMeta?: boolean
  showLogo?: boolean
  showImage?: boolean
}

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  title: { type: { kind: 'richText', maxChars: 80 }, role: 'content', label: 'Title', required: true, guidance: 'Up to 10 words.' },
  subtitle: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Subtitle' },
  meta: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Meta line', guidance: 'Presenter, date.' },
  image: { type: { kind: 'image' }, role: 'content', label: 'Image' },
  alt: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Image alt text' },
  logo: { type: { kind: 'image' }, role: 'content', label: 'Logo' },
  variant: enumSlot(['centered', 'split', 'bleed'], 'Variant', 'split = photo right; bleed = photo behind.'),
  decoration: enumSlot(['none', 'blob', 'arc', 'dots'], 'Decoration'),
  showKicker: { type: { kind: 'boolean' }, role: 'option', label: 'Show kicker', toggles: 'kicker' },
  showSubtitle: { type: { kind: 'boolean' }, role: 'option', label: 'Show subtitle', toggles: 'subtitle' },
  showMeta: { type: { kind: 'boolean' }, role: 'option', label: 'Show meta line', toggles: 'meta' },
  showLogo: { type: { kind: 'boolean' }, role: 'option', label: 'Show logo', toggles: 'logo' },
  showImage: { type: { kind: 'boolean' }, role: 'option', label: 'Show image', toggles: 'image' },
}

export const defaults: CoverProps = {
  kicker: 'Lecture 1',
  title: 'Introduction to Applied Statistics',
  subtitle: 'From data to decisions in six weeks',
  meta: 'Dr. Tran Thi Lan · September 2026',
  image: '',
  alt: '',
  logo: '',
  variant: 'centered',
  decoration: 'blob',
}

const VARIANTS = ['centered', 'split', 'bleed'] as const
const DECOS = ['none', 'blob', 'arc', 'dots'] as const

interface Specs {
  logo?: BlockSpec
  kicker?: BlockSpec
  title: BlockSpec
  subtitle?: BlockSpec
  meta?: BlockSpec
  image?: BlockSpec
}

/** The specs of every shown piece. `size` is chosen from the box by the layout, so it is a parameter. */
function specsOf(props: CoverProps, centered: boolean, size: 'display' | 'title' | 'heading', on?: Record<string, unknown>, fg?: string): Specs {
  const dark = on ?? {}
  const col = fg ? { color: fg } : {}
  const s: Specs = {
    title: { id: 'title', type: 'tls.t.title', props: { text: toMeasurable(props.title), size, ...col, ...dark } },
  }
  if (isShown(props, 'showKicker') && props.kicker) s.kicker = { id: 'kicker', type: 'tls.t.kicker', props: { text: props.kicker, marker: !centered, ...dark } }
  if (isShown(props, 'showSubtitle') && props.subtitle) s.subtitle = { id: 'subtitle', type: 'tls.t.subtitle', props: { text: props.subtitle, ...col, ...dark } }
  if (isShown(props, 'showMeta') && props.meta) s.meta = { id: 'meta', type: 'tls.t.caption', props: { text: props.meta, color: fg ?? 'textMuted', ...dark } }
  if (isShown(props, 'showLogo') && props.logo) {
    s.logo = { id: 'logo', type: 'tls.m.logo', props: { image: props.logo, alt: 'Logo', align: 'start', maxHeight: 'md', ...dark } }
  }
  if (isShown(props, 'showImage') && props.image) {
    s.image = { id: 'image', type: 'tls.m.image', props: { src: props.image, alt: props.alt || plainOf(props.title), fit: 'cover' } }
  }
  return s
}

/** The content stack (logo, kicker, title, subtitle, meta): used for depth/measure checks. */
export function buildCover(props: CoverProps): BlockSpec {
  const s = specsOf(props, false, 'title')
  const children = [s.logo, s.kicker, s.title, s.subtitle, s.meta].filter(Boolean) as BlockSpec[]
  return { id: 'cover', type: 'tls.l.stack', props: { gap: 'md', sizing: 'content', children } }
}

const decoSpec = (shape: string, tone: string, seed: number): BlockSpec => ({
  id: 'decoration',
  type: 'tls.m.decoration',
  props: { shape, tone, opacity: 'soft', seed },
})

/** Place the cover. Exported for tests. */
export function layoutCover(props: CoverProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const variant = pick(props.variant, VARIANTS, 'centered')
  const deco = pick(props.decoration, DECOS, 'blob')
  const gap = ctx.tokens.space.md
  const wantImage = isShown(props, 'showImage') && !!props.image
  const bleed = variant === 'bleed'
  const split = variant === 'split'
  const inset = bleed ? ctx.tokens.space['2xl'] : 0
  const centered = variant === 'centered'

  const tw = centered ? Math.min(W, 1280) : bleed ? Math.min(W - 2 * inset, 1100) : Math.max(120, W * 0.5 - gap * 2)
  const tx = centered ? (W - tw) / 2 : inset
  const align = centered ? 'center' : 'start'
  const darkBg: Record<string, unknown> | undefined = bleed
    ? onSurface(wantImage ? SCRIM_SURFACE : { type: 'solid', color: ctx.resolveColor('accent').color })
    : undefined
  const fg = bleed ? onColor(ctx, wantImage ? '#000000' : ctx.resolveColor('accent').color) : undefined
  const sizes: Array<'display' | 'title' | 'heading'> = centered ? ['display', 'title', 'heading'] : ['title', 'heading']
  const maxLines = centered ? 3 : 4
  const start = Math.max(0, sizes.indexOf(pickToken(ctx, props.title, tw, sizes, maxLines) as (typeof sizes)[number]))
  // Step the title down until the whole column fits the box height (or the smallest size is reached).
  let s = specsOf(props, centered, sizes[start], darkBg, fg)
  let text: BlockSpec[] = []
  let th: number[] = []
  let blockH = 0
  let logoH = 0
  let metaH = 0
  let needed = 0
  for (let k = start; k < sizes.length; k++) {
    s = specsOf(props, centered, sizes[k], darkBg, fg)
    text = [s.kicker, s.title, s.subtitle].filter(Boolean) as BlockSpec[]
    th = measureHeights(ctx, text, tw)
    blockH = th.reduce((a, b) => a + b, 0) + gap * Math.max(0, text.length - 1) + (s.kicker ? gap / 2 : 0)
    logoH = s.logo ? 96 : 0
    metaH = s.meta ? measureHeights(ctx, [s.meta], tw)[0] : 0
    needed = inset * 2 + (logoH ? logoH + gap : 0) + blockH + (metaH ? metaH + gap : 0) + gap
    if (needed <= H) break
  }
  const total = Math.max(H, needed)

  const pieces: Piece[] = []
  const full = { x: 0, y: 0, width: W, height: total }
  // Backgrounds first.
  if (bleed) {
    if (wantImage && s.image) pieces.push({ id: 'image', spec: s.image, box: full })
    else pieces.push({ id: 'field', spec: { id: 'field', type: 'tls.l.card', props: { padding: 'md', children: [], $block: { style: { surface: 'accent' } } } }, box: full })
    if (wantImage) pieces.push({ id: 'scrim', spec: { id: 'scrim', type: 'tls.l.card', props: { padding: 'md', children: [], $block: { style: { surface: 'scrim' } } } }, box: full })
  } else if (split && wantImage && s.image) {
    pieces.push({ id: 'image', spec: s.image, box: { x: W / 2 + gap, y: 0, width: W / 2 - gap, height: total } })
  } else if (deco !== 'none') {
    const dw = split ? W * 0.42 : W * 0.38
    const dh = Math.min(total, dw * 0.9)
    const box = split ? { x: W - dw, y: (total - dh) / 2, width: dw, height: dh } : { x: W - dw, y: 0, width: dw, height: dh }
    pieces.push({ id: 'decoration', spec: decoSpec(deco, 'accent', 7), box })
  }

  // Text column: logo at the top, the title block centred in the free space (bottom-anchored for bleed), meta last.
  let y = inset
  if (s.logo) {
    pieces.push({ id: 'logo', spec: s.logo, box: { x: tx, y, width: centered ? tw : 240, height: logoH }, align: 'start' })
    y += logoH + gap
  }
  const metaTop = total - inset - metaH
  const freeTop = y
  const freeBottom = metaH ? metaTop - gap : total - inset
  const blockTop = bleed ? Math.max(freeTop, freeBottom - blockH) : Math.max(freeTop, freeTop + (freeBottom - freeTop - blockH) / 2)
  let cy = blockTop
  const place = (spec: BlockSpec, id: string, h: number, extraAfter = 0) => {
    pieces.push({ id, spec, box: { x: tx, y: cy, width: tw, height: h }, align })
    cy += h + gap + extraAfter
  }
  let i = 0
  if (s.kicker) place(s.kicker, 'kicker', th[i++], -gap / 2)
  place(s.title, 'title', th[i++])
  if (s.subtitle) place(s.subtitle, 'subtitle', th[i++])
  if (s.meta) pieces.push({ id: 'meta', spec: s.meta, box: { x: tx, y: metaTop, width: tw, height: metaH }, align })

  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<CoverProps>({
  type: 'tls.c.cover',
  name: 'Cover',
  family: 'composite',
  tier: 'A',
  summary: 'Title slide: kicker, title, subtitle, meta; centred, split or over a photo.',
  keywords: ['cover', 'title slide', 'opening', 'first slide', 'intro', 'lecture title', 'photo'],
  category: 'cover',
  scope: 'slide',
  shortDescription: 'Title slide with kicker, title, subtitle and meta line, centred, split or over a photo',
  related: ['tls.c.hero', 'tls.c.divider'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'First slide of a deck or talk.',
    avoid: 'Text-only opener with a button: tls.c.hero. Mid-deck sections: tls.c.divider.',
    example: {
      id: 'b_cover',
      type: 'tls.c.cover',
      props: {
        kicker: 'Lecture 1',
        title: 'Introduction to Applied Statistics',
        subtitle: 'From data to decisions',
        meta: 'Dr. Tran Thi Lan · 2026',
        image: '/demo/photo-1.svg',
        logo: '/demo/logo-1.svg',
        variant: 'split',
      },
    },
  },
  motion: { parts: ['root'], preset: 'fade-up' },
  build: buildCover,
})

export const tlsCCover: BlockDefinition = {
  ...composite,
  // Fills the region; the layout reports a taller root when the content needs it.
  intrinsicSize: undefined,
  layout: ((props: CoverProps, ctx: LayoutContext): LayoutNode => layoutCover(props, ctx)) as BlockDefinition['layout'],
}
