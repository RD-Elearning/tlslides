import { FontStyle } from '~types'
import type { BlockSpec, DeckStyle, MasterSpec, Paint } from '../types'
import { band, motif, placePx } from './_place'

/**
 * AC5 — Premium & Elegant "Luxury" (`reviews/blocks/ai-curation/README.md` §3.3). Near-black with
 * warm ivory type and one gold accent, Playfair Display headlines over Inter, square corners,
 * hairline gold outlines and no shadows. Every slide sits inside a thin gold frame (a double frame
 * on cover and closing) over a soft radial vignette; the section slide adds a large gold ring in
 * its empty half. Motion is slow fades.
 */
const FONTS = { heading: FontStyle.Serif, body: FontStyle.Sans, headingFamily: '"Playfair Display", "Playfair Display Variable", serif', bodyFamily: '"Inter"' }

/** A hairline frame `inset` units inside the slide edge, in a colour role. */
function frame(inset: number, w: number, role: string): Record<string, BlockSpec> {
  const L = 1920 - 2 * inset
  const H = 1080 - 2 * inset
  return {
    [`frame${inset}-t`]: placePx(band(role), inset, inset, L, w),
    [`frame${inset}-b`]: placePx(band(role), inset, 1080 - inset - w, L, w),
    [`frame${inset}-l`]: placePx(band(role), inset, inset, w, H),
    [`frame${inset}-r`]: placePx(band(role), 1920 - inset - w, inset, w, H),
  }
}

const VIGNETTE: Paint = {
  type: 'radialGradient',
  cx: 0.5,
  cy: 0.42,
  stops: [
    { color: 'theme:surface', at: 0 },
    { color: 'theme:background', at: 1 },
  ],
}

const MASTERS: MasterSpec[] = [
  { name: 'cover', blocks: { ...frame(40, 2, 'accent'), ...frame(54, 2, 'accent2') }, background: VIGNETTE },
  {
    name: 'section',
    // AC8.5: the ring from x 1380 (was 1140): clear of the divider's display-size title
    blocks: { ...frame(40, 2, 'accent'), ring: placePx(motif('ring', { tone: 'accent', opacity: 'soft' }), 1380, 240, 600, 600) },
    background: VIGNETTE,
  },
  { name: 'content', blocks: frame(40, 2, 'accent'), background: VIGNETTE },
]

export const LUXURY_STYLE: DeckStyle = {
  id: 'luxury',
  family: 'premium',
  name: 'Luxury',
  brief:
    'Premium deck: near-black slides, ivory serif headlines, one gold accent, thin gold frame and hairline ' +
    'outlines, square corners, slow fades. Few words, big numbers, generous space.',
  palettes: [
    {
      id: 'luxury-noir',
      name: 'Luxury Noir',
      colors: {
        background: '#0E0E10',
        surface: '#1A1917',
        text: '#F5F1E8',
        textMuted: '#B7AE9C',
        accent1: '#C8A96A',
        accent2: '#8C6D3F',
        positive: '#8FC79A',
        negative: '#E58A7E',
        warning: '#E0B45A',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: false, cornerRadius: 0 },
    },
    {
      id: 'luxury-ivory',
      name: 'Luxury Ivory',
      colors: {
        background: '#F7F3EC',
        surface: '#EFE7DA',
        text: '#1C1917',
        textMuted: '#5E554A',
        accent1: '#9A7B4F',
        accent2: '#6E5634',
        positive: '#3F6B4A',
        negative: '#9F2D2D',
        warning: '#8A6116',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: false, cornerRadius: 0 },
    },
  ],
  fonts: {
    heading: { family: 'Playfair Display', fallback: FontStyle.Serif, metricsKey: 'playfair-display' },
    body: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' },
  },
  tokens: {
    // hairlines (card outlines, rules, gridlines) in a dark gold rather than grey
    color: { line: '#7A6440' },
    radius: { sm: 0, md: 2, lg: 4, xl: 4 },
    // display stays at the scale's 152: at 160 the accent big-stat no longer fits its size.min (§3.5 gate)
    type: { display: { size: 152, lineHeight: 1.0 }, title: { size: 88, lineHeight: 1.08 }, heading: { size: 60 } },
    motion: {
      duration: { fast: 210, normal: 350, slow: 560 },
      ease: { 'ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  surface: { card: 'outline', stroke: 'hairline', shadow: 0 },
  masters: MASTERS,
  motionStyle: 'subtle',
  blockDefaults: {
    'tls.c.cover': { variant: 'centered', decoration: 'none' },
    'tls.c.divider': { variant: 'numeral', align: 'start' },
    'tls.c.cards': { lead: 'number' },
    'tls.c.agenda': { numbering: 'plain' },
    'tls.c.chart-insight': { side: 'right' },
    'tls.t.quote': { markStyle: 'glyph' },
    'tls.t.takeaway': { tone: 'muted' },
    'tls.c.big-stat': { variant: 'accent' },
    'tls.c.closing': { variant: 'centered' },
    'tls.g.pros-cons': { style: 'columns' },
  },
  variety: {
    'tls.t.title': { align: ['start', 'center'] },
    'tls.c.cover': { variant: ['bleed'] },
    'tls.c.divider': { variant: ['minimal'] },
    'tls.c.cards': { numeral: ['giant'], lead: ['icon'] },
    'tls.c.chart-insight': { side: ['left'] },
    'tls.c.big-stat': { variant: ['plain', 'split'] },
    'tls.c.closing': { variant: ['big-type'] },
  },
  prefer: [],
  avoid: ['tls.d.heatmap', 'tls.d.bubble', 'tls.d.scatter', 'tls.t.tags', 'tls.c.kinetic-title'],
  rules: [
    'At most one accent use per slide.',
    'At most 40 words per slide.',
    'Images full-bleed or not at all.',
    'Big numbers and quotes over lists.',
  ],
}
