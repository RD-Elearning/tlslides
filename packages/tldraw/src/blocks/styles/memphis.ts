import { FontStyle } from '~types'
import type { BlockSpec, DeckStyle, MasterSpec } from '../types'
import { band, motif, placePx } from './_place'

/**
 * AC5 — Playful & Creative "Memphis" (`reviews/blocks/ai-curation/README.md` §3.3). Cream paper,
 * heavy Bricolage Grotesque over Nunito, flat bright pink / teal / yellow / blue, black outlines and
 * hard offset shadows, nearly square corners. Geometric confetti — zigzag bands, triangles, half
 * circles, dot patches, squiggles — sits in the margins and the empty half of a slide, never under
 * text. Scale pop-ins.
 */
const FONTS = { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Bricolage Grotesque", "Bricolage Grotesque Variable", sans-serif', bodyFamily: '"Nunito", "Nunito Variable", sans-serif' }

const at = (shape: string, tone: string, x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}): BlockSpec =>
  placePx(motif(shape, { tone, opacity: 'strong', ...extra }), x, y, w, h)
const dots = (x: number, y: number, w: number, h: number): BlockSpec =>
  placePx({ id: 'dots', type: 'tls.m.pattern', props: { pattern: 'dots', tone: 'accent', opacity: 'medium', scale: 'sm' } }, x, y, w, h)

const MASTERS: MasterSpec[] = [
  {
    name: 'cover',
    blocks: {
      'dots-tl': dots(40, 40, 300, 200),
      'tri-tr': at('triangle', 'accent2', 1560, 60, 280, 280, { rotation: 14 }),
      'half-bl': at('half-circle', 'accent', 40, 780, 460, 260),
      'ring-bl': at('ring', 'accent2', 520, 880, 150, 150),
      'zig-br': at('zigzag', 'accent', 1400, 970, 460, 70),
      'squig-tl': at('squiggle', 'accent', 1240, 80, 260, 70, { seed: 5 }),
      'yellow-sq': placePx(band('warning'), 1700, 620, 140, 140),
      'yellow-bar': placePx(band('warning'), 360, 120, 160, 26),
    },
    background: { type: 'solid', color: 'theme:background' },
  },
  {
    // a loud pink section page: a white half circle, a yellow square, a dot patch and a white
    // zigzag (opaque shapes: a 70 % teal over the pink reads muddy)
    name: 'section',
    blocks: {
      'half-big': at('half-circle', 'alt', 1140, 600, 720, 420),
      'yellow-sq': placePx(band('warning'), 1580, 150, 200, 200),
      dots: placePx({ id: 'dots', type: 'tls.m.pattern', props: { pattern: 'dots', tone: 'line', opacity: 'medium', scale: 'sm' } }, 1180, 120, 340, 260),
      zig: at('zigzag', 'alt', 1140, 1000, 720, 56),
    },
    background: { type: 'solid', color: 'theme:accent1' },
  },
  {
    name: 'content',
    // confetti in the top-right margin and the bottom-left corner only
    blocks: {
      'dots-tr': dots(1700, 24, 200, 64),
      'tri-tr': at('triangle', 'accent2', 1840, 100, 56, 56, { rotation: 18 }),
      'zig-bl': at('zigzag', 'accent', 40, 1024, 260, 40),
    },
    background: { type: 'solid', color: 'theme:background' },
  },
]

export const MEMPHIS_STYLE: DeckStyle = {
  id: 'memphis',
  family: 'playful',
  name: 'Memphis',
  brief:
    'Memphis deck: cream paper, heavy grotesk headlines, flat pink, teal, yellow and blue, black outlines ' +
    'with hard offset shadows, geometric confetti (zigzags, triangles, dots) in the margins. Loud and fun.',
  palettes: [
    {
      id: 'memphis-pop',
      name: 'Memphis Pop',
      colors: {
        background: '#FFF6E9',
        surface: '#FFFFFF',
        text: '#1B1B1B',
        textMuted: '#4A4440',
        accent1: '#FF4F79',
        accent2: '#2EC4B6',
        positive: '#13795B',
        negative: '#B42318',
        warning: '#FFC93C',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: true, cornerRadius: 4 },
    },
  ],
  fonts: {
    heading: { family: 'Bricolage Grotesque', fallback: FontStyle.Sans, metricsKey: 'bricolage-grotesque' },
    body: { family: 'Nunito', fallback: FontStyle.Sans, metricsKey: 'nunito' },
  },
  tokens: {
    categorical: ['#FF4F79', '#2EC4B6', '#FFC93C', '#3A86FF', '#8338EC', '#FB5607'],
    radius: { sm: 0, md: 4, lg: 8, xl: 8 },
    type: { display: { size: 164, lineHeight: 0.98 }, title: { size: 96, lineHeight: 1.02 } },
    motion: { ease: { 'ease-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)' } },
  },
  surface: { card: 'filled', stroke: 'bold', shadow: 'hard' },
  masters: MASTERS,
  motionStyle: 'expressive',
  blockDefaults: {
    'tls.c.cover': { variant: 'centered', decoration: 'none' },
    'tls.c.divider': { variant: 'numeral', align: 'start' },
    'tls.c.cards': { tone: 'accent-first', lead: 'icon' },
    'tls.c.agenda': { variant: 'cards', numbering: 'badge' },
    'tls.c.feature-grid': { cell: 'card' },
    'tls.c.kpi-row': { tile: 'card' },
    'tls.t.tags': { tone: 'solid' },
    'tls.c.chart-insight': { side: 'right' },
    'tls.t.quote': { markStyle: 'glyph' },
    'tls.t.takeaway': { tone: 'accent' },
    'tls.g.chevrons': { fill: 'series' },
    'tls.c.closing': { variant: 'centered' },
    'tls.g.pros-cons': { style: 'cards' },
  },
  prefer: ['tls.t.tags'],
  avoid: ['tls.d.table', 'tls.t.footnote', 'tls.d.compare-table'],
  rules: ['At most three motifs per slide, never over text.', 'Flat bright colours, black outlines.', 'Short punchy headlines.'],
}
