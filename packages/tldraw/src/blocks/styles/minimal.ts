import { FontStyle } from '~types'
import type { DeckStyle } from '../types'

/** AC1 pilot — Elegant Minimalism (`reviews/blocks/ai-curation/README.md` §3.3). AC3: Be Vietnam Pro headings over Inter body. */
export const MINIMAL_STYLE: DeckStyle = {
  id: 'minimal',
  family: 'premium',
  name: 'Minimal',
  brief:
    'Quiet, gallery-like deck: lots of white space, near-black type, grey as the only second colour, ' +
    'open cards under a hairline, no decoration. One idea per slide.',
  palettes: [
    {
      id: 'minimal-white',
      name: 'Minimal White',
      colors: {
        background: '#FFFFFF',
        surface: '#F4F4F4',
        text: '#111111',
        textMuted: '#5C5C5C',
        accent1: '#111111',
        accent2: '#8A8A8A',
        positive: '#2E7D32',
        negative: '#B3261E',
        warning: '#9A6700',
      },
      fonts: { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Be Vietnam Pro", sans-serif', bodyFamily: '"Inter"' },
      shapeDefaults: { isFilled: false, cornerRadius: 12 },
    },
    {
      id: 'minimal-stone',
      name: 'Minimal Stone',
      colors: {
        background: '#F5F3EF',
        surface: '#EAE6DF',
        text: '#1C1C1C',
        textMuted: '#57534E',
        accent1: '#3F3F46',
        accent2: '#A8A29E',
        positive: '#3F6B4A',
        negative: '#9F2D2D',
        warning: '#8A6116',
      },
      fonts: { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Be Vietnam Pro", sans-serif', bodyFamily: '"Inter"' },
      shapeDefaults: { isFilled: false, cornerRadius: 12 },
    },
  ],
  fonts: {
    heading: { family: 'Be Vietnam Pro', fallback: FontStyle.Sans, metricsKey: 'be-vietnam-pro' },
    body: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' },
  },
  tokens: {
    density: 'roomy',
    radius: { sm: 6, md: 12, lg: 12, xl: 16 },
    type: { display: { size: 136 }, title: { size: 80, lineHeight: 1.1 }, heading: { size: 56 } },
  },
  // ghost cards with a hairline top rule (a ghost with no stroke paints nothing at all)
  surface: { card: 'ghost', stroke: 'hairline', shadow: 0 },
  masters: [],
  motionStyle: 'subtle',
  blockDefaults: {
    'tls.c.cover': { variant: 'centered', decoration: 'none' },
    'tls.c.divider': { variant: 'minimal', align: 'start' },
    // AC5 lead review: no `tone` default — the deck surface (ghost + hairline top rule) paints the cards.
    'tls.c.cards': { lead: 'number' },
    'tls.c.chart-insight': { side: 'below' },
    'tls.g.chevrons': { fill: 'single' },
    'tls.t.quote': { markStyle: 'none' },
    'tls.t.takeaway': { tone: 'muted' },
    'tls.c.closing': { variant: 'centered' },
    'tls.d.table': { rules: 'head', header: 'bold', zebra: false },
    'tls.g.pros-cons': { style: 'columns' },
  },
  prefer: [],
  avoid: ['tls.m.decoration', 'tls.m.pattern', 'tls.c.kinetic-title'],
  rules: ['One idea per slide.', 'White space over decoration.', 'Grey and black only; accent for one word at most.'],
}
