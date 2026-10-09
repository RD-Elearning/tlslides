import { FontStyle } from '~types'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared/deck-theme'
import type { DeckStyle } from '../types'

const builtIn = (id: string) => {
  const t = BUILT_IN_DECK_THEMES.find((x) => x.id === id)
  if (!t) throw new Error(`corporate style: unknown built-in theme ${id}`)
  return t
}

/** AC1 pilot — Professional & Corporate (`reviews/blocks/ai-curation/README.md` §3.3). */
export const CORPORATE_STYLE: DeckStyle = {
  id: 'corporate',
  family: 'professional',
  name: 'Corporate',
  brief:
    'Clean business deck: white slides, navy text, one blue accent, small radii, numbers and charts first. ' +
    'Calm, consistent, every data slide states its takeaway.',
  palettes: [
    {
      id: 'corporate-navy',
      name: 'Corporate Navy',
      colors: {
        background: '#FFFFFF',
        surface: '#EEF3F9',
        text: '#0B1F33',
        textMuted: '#4A5B6E',
        accent1: '#0B5FFF',
        accent2: '#00A3A1',
        positive: '#12805C',
        negative: '#C62828',
        warning: '#B26A00',
      },
      fonts: { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Inter"', bodyFamily: '"Inter"' },
      shapeDefaults: { isFilled: true, cornerRadius: 8 },
    },
    builtIn('midnight'),
    builtIn('mono-grid'),
  ],
  fonts: {
    heading: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' },
    body: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' },
  },
  tokens: {
    radius: { sm: 4, md: 8, lg: 12, xl: 16 },
    type: { display: { size: 128 }, title: { size: 72 }, heading: { size: 56 } },
  },
  surface: { card: 'filled', stroke: 'none', shadow: 1 },
  masters: [
    { name: 'cover', blocks: {}, background: { type: 'linearGradient', angle: 180, stops: [{ color: 'theme:background', at: 0 }, { color: 'theme:background', at: 0.7 }, { color: 'theme:surface', at: 1 }] } },
    { name: 'section', blocks: {}, background: { type: 'solid', color: 'theme:surface' } },
    { name: 'content', blocks: {}, background: { type: 'solid', color: 'theme:background' } },
  ],
  motionStyle: 'subtle',
  blockDefaults: {
    'tls.c.cover': { variant: 'split', decoration: 'none' },
    'tls.c.divider': { variant: 'field', align: 'start' },
    'tls.c.cards': { tone: 'alt', lead: 'icon' },
    'tls.c.chart-insight': { showSource: true, side: 'right' },
    'tls.d.table': { rules: 'horizontal', header: 'filled' },
    'tls.t.quote': { markStyle: 'rule' },
    'tls.t.takeaway': { tone: 'accent' },
    'tls.c.closing': { variant: 'split' },
    'tls.g.pros-cons': { style: 'cards' },
  },
  prefer: ['tls.g.roadmap', 'tls.c.dashboard'],
  avoid: ['tls.c.kinetic-title', 'tls.m.decoration', 'tls.m.pattern'],
  rules: [
    'Every chart or table has a one-line takeaway.',
    'Consistent number formats across a slide.',
    'One accent use per slide; no decoration.',
  ],
}
