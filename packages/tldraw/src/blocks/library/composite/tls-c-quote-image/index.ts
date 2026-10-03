/**
 * tls.c.quote-image — a large quote over a full-bleed photo with a dark scrim.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (an overlay of image, scrim and a text stack);
 * `layout()` places the same pieces by hand and flattens them (see `../_kit.ts`): photo, one scrim rect,
 * a quotation mark, the quote, the name and role. The text is white-ish (`onColor` over black), the
 * block anchors it bottom-left, left (vertically centred) or centred.
 *
 * Contrast: the photo's pixels are unknowable at layout time, so the scrim is made strong enough for
 * the WORST case, a pure white photo. `scrimAlpha` raises the theme scrim (`rgba(0,0,0,0.6)` by default)
 * to at least 0.55 (`medium`) or 0.75 (`strong`), which keeps white text at >= 4.5:1 even on white.
 * `lint()` runs the same worst-case maths (`quote-image/scrim-contrast`) so a theme with a weak or
 * light scrim is reported, plus `alt/missing`.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, LintContext, LintFinding } from '../../../types'
import { contrastRatio, relativeLuminance, tryHexToRgb } from '../../../color-math'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { onColor } from '../../text/_engine/color'
import { altFindings, str } from '../../media/_kit'
import { composeFlat, measureHeights, onSurface, pick, pickToken, plainOf, toMeasurable, SCRIM_SURFACE, type Piece } from '../_kit'

export interface QuoteImageProps extends Record<string, unknown> {
  image: string
  alt: string
  quote: string
  name?: string
  role?: string
  anchor?: 'bottom-left' | 'center' | 'left'
  scrim?: 'medium' | 'strong'
}

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Photo', required: true },
  alt: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Photo alt text', required: true, guidance: '1-10 words describing the photo.' },
  quote: { type: { kind: 'richText', maxChars: 200 }, role: 'content', label: 'Quote', required: true, guidance: 'One or two sentences.' },
  name: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Name' },
  role: { type: { kind: 'text', maxChars: 50 }, role: 'content', label: 'Role' },
  anchor: enumSlot(['bottom-left', 'center', 'left'], 'Anchor', 'Where the text sits on the photo.'),
  scrim: enumSlot(['medium', 'strong'], 'Scrim', 'strong = darker wash for busy photos.'),
}

export const defaults: QuoteImageProps = {
  image: '/demo/photo-1.svg',
  alt: 'Students working together at a long table',
  quote: 'Statistics is the grammar of science: it lets data speak in sentences.',
  name: 'Dr. Tran Thi Lan',
  role: 'Head of Data Science',
  anchor: 'bottom-left',
  scrim: 'medium',
}

const ANCHORS = ['bottom-left', 'center', 'left'] as const
const SCRIMS = ['medium', 'strong'] as const
const MIN_ALPHA = { medium: 0.55, strong: 0.75 } as const

/** Parse `rgba(r,g,b,a)` or a hex colour into black-or-colour + alpha. */
function parseScrim(c: unknown): { rgb: [number, number, number]; a: number } {
  if (typeof c === 'string') {
    const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
    if (m) return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], a: m[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(m[4]))) }
    const h = tryHexToRgb(c)
    if (h) return { rgb: [h.r, h.g, h.b], a: 1 }
  }
  return { rgb: [0, 0, 0], a: 0.6 }
}

/** The wash drawn over the photo: theme scrim colour, alpha raised to the level's floor. */
export function scrimColor(base: unknown, level: 'medium' | 'strong'): string {
  const { rgb, a } = parseScrim(base)
  const alpha = Math.round(Math.min(0.92, Math.max(a + (level === 'strong' ? 0.18 : 0), MIN_ALPHA[level])) * 100) / 100
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`
}

/** Contrast of white text over the scrim laid on a pure white photo (the worst case). */
export function worstCaseContrast(scrim: string): number {
  const { rgb, a } = parseScrim(scrim)
  const bg = rgb.map((v) => 255 * (1 - a) + v * a)
  const lum = relativeLuminance({ r: bg[0], g: bg[1], b: bg[2] })
  return contrastRatio(1, lum)
}

export function lintQuoteImage(props: QuoteImageProps, ctx?: Partial<LintContext>): LintFinding[] {
  const out: LintFinding[] = altFindings([{ src: props.image, alt: props.alt, part: 'image' }])
  const level = pick(props.scrim, SCRIMS, 'medium')
  const base = (ctx as { tokens?: { color?: { scrim?: unknown } } } | undefined)?.tokens?.color?.scrim
  const used = base === undefined ? scrimColor('rgba(0,0,0,0.6)', level) : scrimColor(base, level)
  const ratio = worstCaseContrast(used)
  if (ratio < 4.5) {
    out.push({
      level: 'warning',
      rule: 'quote-image/scrim-contrast',
      part: 'scrim',
      message: `White text over the ${level} scrim (${used}) reads at ${ratio.toFixed(1)}:1 on a white photo; use scrim "strong" or a darker theme scrim.`,
    })
  }
  return out
}

const nameSpec = (props: QuoteImageProps, on?: Record<string, unknown>, fg?: string): BlockSpec | undefined =>
  str(props.name).trim() ? { id: 'name', type: 'tls.t.subtitle', props: { text: str(props.name), ...(fg ? { color: fg } : {}), ...(on ?? {}) } } : undefined
const roleSpec = (props: QuoteImageProps, on?: Record<string, unknown>, fg?: string): BlockSpec | undefined =>
  str(props.role).trim() ? { id: 'role', type: 'tls.t.caption', props: { text: str(props.role), color: fg ?? 'textMuted', ...(on ?? {}) } } : undefined

export function buildQuoteImage(props: QuoteImageProps): BlockSpec {
  const text = [
    { id: 'quote', type: 'tls.t.title', props: { text: toMeasurable(props.quote), size: 'heading' } },
    nameSpec(props),
    roleSpec(props),
  ].filter(Boolean) as BlockSpec[]
  const kids: BlockSpec[] = [
    { id: 'image', type: 'tls.m.image', props: { src: str(props.image), alt: str(props.alt) || plainOf(props.quote), fit: 'cover' } },
    { id: 'scrim', type: 'tls.l.card', props: { padding: 'md', children: [], $block: { style: { surface: 'scrim' } } } },
    { id: 'text', type: 'tls.l.stack', props: { gap: 'md', sizing: 'content', children: text } },
  ]
  return { id: 'quote-image', type: 'tls.l.overlay', props: { children: kids } }
}

export function layoutQuoteImage(props: QuoteImageProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const anchor = pick(props.anchor, ANCHORS, 'bottom-left')
  const level = pick(props.scrim, SCRIMS, 'medium')
  const centered = anchor === 'center'
  const inset = ctx.tokens.space['2xl']
  const gap = ctx.tokens.space.md
  const tw = centered ? Math.min(W - 2 * inset, 1300) : Math.min(W - 2 * inset, anchor === 'left' ? 1000 : 1200)
  const tx = centered ? (W - tw) / 2 : inset
  const align = centered ? 'center' : 'start'
  const fg = onColor(ctx, '#000000')
  const on = onSurface(SCRIM_SURFACE)
  const sizes: Array<'display' | 'title' | 'heading'> = ['title', 'heading']
  const maxLines = 5

  const mark = { id: 'mark', type: 'tls.t.title', props: { text: '“', size: 'display', color: fg, ...on } } as BlockSpec
  const markH = measureHeights(ctx, [mark], tw)[0]
  let qSize = pickToken(ctx, props.quote, tw, sizes, maxLines) as 'title' | 'heading'
  let quote: BlockSpec = { id: 'quote', type: 'tls.t.title', props: { text: toMeasurable(props.quote), size: qSize, color: fg, ...on } }
  let qH = measureHeights(ctx, [quote], tw)[0]
  const name = nameSpec(props, on, fg)
  const role = roleSpec(props, on, fg)
  const nameH = name ? measureHeights(ctx, [name], tw)[0] : 0
  const roleH = role ? measureHeights(ctx, [role], tw)[0] : 0
  const attrH = nameH + roleH
  const overlap = Math.round(markH * 0.45) // the glyph carries a lot of internal leading
  const stackH = Math.max(0, markH - overlap) + qH + (attrH ? gap * 1.5 + attrH : 0)
  const needed = stackH + 2 * inset
  const total = Math.max(H, Math.ceil(needed))

  const top = anchor === 'bottom-left' ? total - inset - stackH : (total - stackH) / 2
  const pieces: Piece[] = []
  const full = { x: 0, y: 0, width: W, height: total }
  pieces.push({ id: 'image', spec: { id: 'image', type: 'tls.m.image', props: { src: str(props.image), alt: str(props.alt) || plainOf(props.quote), fit: 'cover' } }, box: full })
  pieces.push({
    id: 'scrim',
    raw: [{ k: 'rect', box: full, fill: { type: 'solid', color: scrimColor(ctx.resolveColor('scrim').color, level) } } as LayoutNode],
    box: full,
  })
  let y = top - overlap
  pieces.push({ id: 'mark', spec: mark, box: { x: tx, y, width: tw, height: markH }, align })
  y += markH
  pieces.push({ id: 'quote', spec: quote, box: { x: tx, y, width: tw, height: qH }, align })
  y += qH + gap * 1.5
  if (name) {
    pieces.push({ id: 'name', spec: name, box: { x: tx, y, width: tw, height: nameH }, align })
    y += nameH
  }
  if (role) pieces.push({ id: 'role', spec: role, box: { x: tx, y, width: tw, height: roleH }, align })
  void qSize
  void quote
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<QuoteImageProps>({
  type: 'tls.c.quote-image',
  name: 'Quote over photo',
  family: 'composite',
  tier: 'A',
  summary: 'Large quote set over a full-bleed photo with a dark scrim, with name and role.',
  keywords: ['quote', 'inspirational', 'full bleed', 'photo', 'scrim', 'statement', 'big quote'],
  category: 'emphasis',
  scope: 'slide',
  shortDescription: 'Large quote set over a full-bleed photo with a dark scrim',
  related: ['tls.c.testimonial', 'tls.t.quote', 'tls.m.image'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'An emotional or inspirational quote as a full slide.',
    avoid: 'A customer testimonial with a face: tls.c.testimonial.',
    example: {
      id: 'b_quote_image',
      type: 'tls.c.quote-image',
      props: {
        image: '/demo/photo-1.svg',
        alt: 'Students working together',
        quote: 'Statistics lets data speak in sentences.',
        name: 'Dr. Tran Thi Lan',
        role: 'Head of Data Science',
        anchor: 'bottom-left',
        scrim: 'medium',
      },
    },
  },
  motion: { parts: ['root'], preset: 'fade-up' },
  build: buildQuoteImage,
})

export const tlsCQuoteImage: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: QuoteImageProps, ctx: LayoutContext): LayoutNode => layoutQuoteImage(props, ctx)) as BlockDefinition['layout'],
  lint: ((props: QuoteImageProps, ctx: LintContext): LintFinding[] => lintQuoteImage(props, ctx)) as BlockDefinition['lint'],
}
