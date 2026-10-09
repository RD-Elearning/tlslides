import { FontStyle } from '~types'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import type { BlockSpec, DeckStyle, MasterSpec } from '../types'
import { band, placePx } from './_place'

const builtIn = (id: string) => {
  const t = BUILT_IN_DECK_THEMES.find((x) => x.id === id)
  if (!t) throw new Error(`editorial style: unknown built-in theme ${id}`)
  return t
}

/**
 * AC5 — Premium & Elegant "Editorial" (`reviews/blocks/ai-curation/README.md` §3.3). A magazine
 * page: warm paper, ink-black Fraunces headlines over Inter, one red accent, square corners. Every
 * page carries a masthead (a heavy ink rule over a hairline) and a folio rule at the foot; cards
 * are open columns under an ink rule with giant numerals, pull quotes get big red marks, and the
 * closing is one giant flush-left line.
 */
const FONTS = { heading: FontStyle.Serif, body: FontStyle.Sans, headingFamily: '"Fraunces", "Fraunces Variable", serif', bodyFamily: '"Inter"' }

/** The masthead: a heavy ink rule and a hairline under it, across the type area. */
const MASTHEAD: Record<string, BlockSpec> = {
  'mast-heavy': placePx(band('text'), 96, 44, 1728, 6),
  'mast-hair': placePx(band('text'), 96, 58, 1728, 2),
}
/** The folio rule at the foot of the page. */
const FOLIO: Record<string, BlockSpec> = { folio: placePx(band('text'), 96, 1032, 1728, 2) }

const MASTERS: MasterSpec[] = [
  {
    name: 'cover',
    blocks: { ...MASTHEAD, ...FOLIO, 'cover-accent': placePx(band('accent'), 912, 1018, 96, 8) },
    background: { type: 'solid', color: 'theme:background' },
  },
  {
    name: 'section',
    blocks: { ...MASTHEAD, ...FOLIO, 'section-bar': placePx(band('accent'), 96, 84, 140, 10) },
    background: { type: 'solid', color: 'theme:surface' },
  },
  { name: 'content', blocks: { ...MASTHEAD, ...FOLIO }, background: { type: 'solid', color: 'theme:background' } },
]

export const EDITORIAL_STYLE: DeckStyle = {
  id: 'editorial',
  family: 'premium',
  name: 'Editorial',
  brief:
    'Magazine deck: warm paper, ink serif headlines, one red accent, a masthead rule on every page, open ' +
    'columns under ink rules, giant numerals and pull quotes. Kicker, title, rule; let type carry it.',
  palettes: [
    {
      id: 'editorial-ink',
      name: 'Editorial Ink',
      colors: {
        background: '#FAF8F3',
        surface: '#F1ECE2',
        text: '#111111',
        textMuted: '#55524C',
        accent1: '#C1272D',
        accent2: '#1F3A5F',
        positive: '#2F6B3F',
        negative: '#8E2A1E',
        warning: '#8A5A00',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: false, cornerRadius: 0 },
    },
    builtIn('ivory-editorial'),
  ],
  fonts: {
    heading: { family: 'Fraunces', fallback: FontStyle.Serif, metricsKey: 'fraunces' },
    body: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' },
  },
  tokens: {
    radius: { sm: 0, md: 0, lg: 0, xl: 0 },
    type: { display: { size: 168, lineHeight: 0.98 }, title: { size: 92, lineHeight: 1.04 }, heading: { size: 60 } },
  },
  surface: { card: 'ghost', stroke: 'bold', shadow: 0 },
  masters: MASTERS,
  motionStyle: 'subtle',
  blockDefaults: {
    'tls.c.cover': { variant: 'centered', decoration: 'none' },
    'tls.c.divider': { variant: 'numeral', align: 'start' },
    'tls.c.cards': { lead: 'number', numeral: 'giant' },
    'tls.c.agenda': { numbering: 'plain' },
    'tls.c.chart-insight': { side: 'right' },
    'tls.t.statement': { emphasis: 'underline' },
    'tls.t.kicker': { case: 'uppercase', tracking: 'wide' },
    'tls.t.quote': { markStyle: 'glyph' },
    'tls.t.takeaway': { tone: 'accent' },
    'tls.d.table': { rules: 'head', header: 'bold', zebra: false },
    'tls.c.closing': { variant: 'big-type' },
    'tls.g.pros-cons': { style: 'columns' },
  },
  prefer: ['tls.t.kicker'],
  avoid: ['tls.m.pattern', 'tls.t.tags', 'tls.c.kinetic-title'],
  rules: ['Kicker, title, rule: let type carry the page.', 'Pull quotes over bullet lists.', 'No glass, orbs, pills or gradients.'],
}
