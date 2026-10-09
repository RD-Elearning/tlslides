import { FontStyle } from '~types'
import type { BlockSpec, DeckStyle, MasterSpec } from '../types'
import { motif, placePx } from './_place'

/**
 * AC5 — Playful & Creative "Doodle" (`reviews/blocks/ai-curation/README.md` §3.3; absorbs Kids
 * Cartoon as the `doodle-kids` palette). Warm paper, Patrick Hand headlines over Nunito, very round
 * cards with a bold ink outline, and hand-drawn motifs in the margins — Rough.js stars, sparkles
 * and squiggles (`tls.m.decoration`), seeded so every render is the same. Short pops for motion.
 */
const FONTS = { heading: FontStyle.Script, body: FontStyle.Sans, headingFamily: '"Patrick Hand", cursive', bodyFamily: '"Nunito", "Nunito Variable", sans-serif' }

const at = (shape: string, tone: string, seed: number, x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}): BlockSpec =>
  placePx(motif(shape, { tone, opacity: 'strong', seed, ...extra }), x, y, w, h)

const MASTERS: MasterSpec[] = [
  {
    name: 'cover',
    blocks: {
      star: at('star', 'accent', 3, 150, 130, 150, 150, { rotation: 12 }),
      sparkle: at('sparkle', 'accent2', 5, 1660, 150, 110, 110),
      'sparkle-sm': at('sparkle', 'accent', 9, 1580, 280, 56, 56),
      squiggle: at('squiggle', 'accent2', 7, 160, 860, 380, 70),
      'star-sm': at('star', 'accent2', 4, 1640, 840, 96, 96, { rotation: -10 }),
    },
    background: { type: 'solid', color: 'theme:background' },
  },
  {
    name: 'section',
    blocks: {
      star: at('star', 'accent', 6, 1240, 260, 520, 520, { rotation: 8 }),
      sparkle: at('sparkle', 'accent2', 2, 1140, 210, 120, 120),
      squiggle: at('squiggle', 'accent2', 8, 1220, 860, 520, 72),
    },
    background: { type: 'solid', color: 'theme:surface' },
  },
  {
    name: 'content',
    // a small sparkle in the top-right corner of the margin, a squiggle under it: never over text
    blocks: {
      sparkle: at('sparkle', 'accent', 1, 1812, 30, 64, 64),
      'sparkle-sm': at('sparkle', 'accent2', 4, 1772, 40, 30, 30),
      squiggle: at('squiggle', 'accent2', 3, 1696, 1006, 180, 40),
    },
    background: { type: 'solid', color: 'theme:background' },
  },
]

export const DOODLE_STYLE: DeckStyle = {
  id: 'doodle',
  family: 'playful',
  name: 'Doodle',
  brief:
    'Hand-drawn deck: warm paper, handwritten headlines, round cards with a bold ink outline, sketched ' +
    'stars, sparkles and squiggles in the margins, bright coral and teal. Friendly and short.',
  palettes: [
    {
      id: 'doodle-paper',
      name: 'Doodle Paper',
      colors: {
        background: '#FFFDF6',
        surface: '#FFF0DC',
        text: '#1F1F1F',
        textMuted: '#57534E',
        accent1: '#FF7A59',
        accent2: '#3DB8A6',
        positive: '#2F855A',
        negative: '#C53030',
        warning: '#B7791F',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: true, cornerRadius: 28 },
    },
    {
      id: 'doodle-kids',
      name: 'Doodle Kids',
      colors: {
        background: '#FFF8E7',
        surface: '#FFE9B8',
        text: '#1F1F1F',
        textMuted: '#4F4A45',
        accent1: '#EE4266',
        accent2: '#3BCEAC',
        positive: '#2F855A',
        negative: '#B42318',
        warning: '#B7791F',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: true, cornerRadius: 32 },
    },
  ],
  fonts: {
    heading: { family: 'Patrick Hand', fallback: FontStyle.Script, metricsKey: 'patrick-hand' },
    body: { family: 'Nunito', fallback: FontStyle.Sans, metricsKey: 'nunito' },
  },
  tokens: {
    radius: { sm: 12, md: 20, lg: 28, xl: 36 },
    type: { display: { size: 168, lineHeight: 1.0 }, title: { size: 100, lineHeight: 1.05 }, heading: { size: 68 } },
    motion: { ease: { 'ease-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)' }, duration: { normal: 300 } },
  },
  surface: { card: 'filled', stroke: 'bold', shadow: 0 },
  masters: MASTERS,
  motionStyle: 'expressive',
  blockDefaults: {
    'tls.c.cover': { variant: 'centered', decoration: 'none' },
    'tls.c.divider': { variant: 'numeral', align: 'start' },
    'tls.c.cards': { lead: 'icon', tone: 'surface', align: 'center' },
    'tls.c.agenda': { variant: 'cards', numbering: 'badge' },
    'tls.m.icon-list': { iconStyle: 'circle' },
    'tls.c.feature-grid': { cell: 'card', iconStyle: 'circle', align: 'center' },
    'tls.t.statement': { emphasis: 'underline' },
    'tls.c.chart-insight': { side: 'right' },
    'tls.t.quote': { markStyle: 'glyph' },
    'tls.t.takeaway': { tone: 'accent' },
    'tls.g.chevrons': { fill: 'series' },
    'tls.c.closing': { variant: 'centered' },
    'tls.g.pros-cons': { style: 'cards' },
  },
  prefer: ['tls.g.cycle', 'tls.c.quiz', 'tls.t.checklist'],
  avoid: ['tls.d.table', 'tls.d.scatter', 'tls.d.bubble', 'tls.d.heatmap'],
  rules: ['Friendly, short sentences.', 'One motif per slide, in the margin.', 'Icons and pictures over dense text.'],
}
