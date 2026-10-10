import { FontStyle } from '~types'
import type { BlockSpec, DeckStyle, MasterSpec, Paint } from '../types'
import { motif, placePx } from './_place'

/**
 * AC5 — Modern & Digital "Glassmorphism" (`reviews/blocks/ai-curation/README.md` §3.3). A deep
 * violet-to-blue gradient (or a pastel one) with `mesh` glows and large lit `orb`s behind the
 * content; every card is frosted glass (translucent white, light hairline, soft shadow; html
 * blocks add a DOM-only backdrop blur). Plus Jakarta Sans over Inter, very round corners.
 * The palette's `background` → `surface` pair is the gradient.
 */
const FONTS = { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Variable", sans-serif', bodyFamily: '"Inter"' }

const GRADIENT = (angle: number): Paint => ({
  type: 'linearGradient',
  angle,
  stops: [
    { color: 'theme:background', at: 0 },
    { color: 'theme:surface', at: 1 },
  ],
})
const MESH: BlockSpec = { id: 'style-mesh', type: 'tls.m.pattern', props: { pattern: 'mesh', opacity: 'medium', scale: 'md' } }
const MESH_SOFT: BlockSpec = { id: 'style-mesh', type: 'tls.m.pattern', props: { pattern: 'mesh', opacity: 'soft', scale: 'md' } }
const GRAIN: BlockSpec = { id: 'style-grain', type: 'tls.m.pattern', props: { pattern: 'grain', tone: 'line', opacity: 'soft', scale: 'md' } }
const orb = (tone: string, x: number, y: number, s: number) => placePx(motif('orb', { tone, opacity: 'strong' }), x, y, s, s)

const MASTERS: MasterSpec[] = [
  {
    name: 'cover',
    // AC8.5: orb-b moved to the bottom-left corner (was 110/720/260: under a two-line hero subtitle)
    blocks: { mesh: MESH, 'orb-a': orb('accent', 1560, 56, 300), 'orb-b': orb('accent2', 40, 860, 200), grain: GRAIN },
    background: GRADIENT(135),
  },
  {
    name: 'section',
    // the divider is flush left: one big orb in the free right part (AC8: from x 1290, clear of a
    // long section title; AC8.5: from x 1400, clear of a display-size title running to x 1296)
    blocks: { mesh: MESH, 'orb-a': orb('accent', 1400, 300, 460), 'orb-b': orb('accent2', 1720, 120, 140), grain: GRAIN },
    background: GRADIENT(120),
  },
  {
    name: 'content',
    // orbs tucked into the corners of the margin: the cards are translucent, so an orb under a
    // card's text shows through at full strength (the first cut, 210 at 1650/850, sat under the
    // bottom-right card's text); these overlap the content box by a corner's padding at most
    // AC8 (lead review: "4 orbs per content slide is busy"): one small orb in the lower-right margin
    // corner and a soft mesh (two glows read as orbs too at medium)
    blocks: { mesh: MESH_SOFT, 'orb-a': orb('accent', 1772, 932, 148), grain: GRAIN },
    background: GRADIENT(150),
  },
]

export const GLASS_STYLE: DeckStyle = {
  id: 'glass',
  family: 'modern',
  name: 'Glass',
  brief:
    'Glassmorphism deck: violet-to-blue gradient with soft glows and lit orbs, content on frosted glass ' +
    'cards with light edges, very round corners, big friendly headlines. Content on glass, never bare.',
  palettes: [
    {
      id: 'glass-violet',
      name: 'Glass Violet',
      colors: {
        background: '#4C1D95',
        surface: '#1E3A8A',
        text: '#FFFFFF',
        textMuted: '#DCD7FB',
        accent1: '#F0ABFC',
        accent2: '#67E8F9',
        positive: '#6EE7B7',
        negative: '#FCA5A5',
        warning: '#FCD34D',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: true, cornerRadius: 32 },
    },
    {
      id: 'glass-pastel',
      name: 'Glass Pastel',
      colors: {
        background: '#E0E7FF',
        surface: '#FCE7F3',
        text: '#1E1B4B',
        textMuted: '#4C4A75',
        accent1: '#7C3AED',
        accent2: '#DB2777',
        positive: '#047857',
        negative: '#B91C1C',
        warning: '#92400E',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: true, cornerRadius: 32 },
    },
  ],
  fonts: {
    heading: { family: 'Plus Jakarta Sans', fallback: FontStyle.Sans, metricsKey: 'plus-jakarta-sans' },
    body: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' },
  },
  tokens: {
    radius: { sm: 16, md: 24, lg: 32, xl: 40 },
    type: { display: { size: 150, lineHeight: 1.02 }, title: { size: 88, lineHeight: 1.06 } },
    motion: { ease: { 'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)' } },
  },
  surface: { card: 'glass', stroke: 'hairline', shadow: 1 },
  masters: MASTERS,
  motionStyle: 'expressive',
  blockDefaults: {
    'tls.c.cover': { variant: 'centered', decoration: 'none' },
    'tls.c.divider': { variant: 'numeral', align: 'start' },
    'tls.c.cards': { tone: 'surface', lead: 'icon', align: 'start' },
    'tls.c.agenda': { variant: 'cards', numbering: 'badge' },
    'tls.c.feature-grid': { cell: 'card' },
    'tls.c.kpi-row': { tile: 'card' },
    'tls.c.comparison': { style: 'cards' },
    'tls.c.chart-insight': { side: 'right' },
    'tls.t.quote': { markStyle: 'glyph' },
    'tls.t.takeaway': { tone: 'accent' },
    'tls.c.closing': { variant: 'centered' },
    'tls.g.pros-cons': { style: 'cards' },
  },
  variety: {
    'tls.t.title': { align: ['start', 'center'] },
    'tls.c.cover': { variant: ['bleed'] },
    'tls.c.divider': { variant: ['minimal'] },
    'tls.c.cards': { lead: ['number'], align: ['center'] },
    'tls.c.chart-insight': { side: ['below'] },
    'tls.c.closing': { variant: ['split'] },
  },
  prefer: [],
  avoid: ['tls.d.table', 'tls.d.compare-table', 'tls.d.heatmap', 'tls.t.footnote'],
  rules: ['Content on glass cards over the glow, never on bare background.', 'At most three chart series.', 'Short, friendly headlines.'],
}
