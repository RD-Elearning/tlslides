import { FontStyle } from '~types'
import type { BlockSpec, DeckStyle, MasterSpec } from '../types'
import { band, placePx } from './_place'

/**
 * AC5 — Professional & Corporate "Consulting" (`reviews/blocks/ai-curation/README.md` §3.3). White
 * pages, Source Serif 4 action titles (a full sentence at heading size) over Inter, a deep navy
 * accent with teal for the second series, square corners, hairline outlines, no motion. Content
 * pages carry a navy tracker tab at the top left, a hairline under the title band and a footer
 * rule; the cover and closing carry a navy spine with a teal hairline; the section page is navy with a teal edge.
 */
const FONTS = { heading: FontStyle.Serif, body: FontStyle.Sans, headingFamily: '"Source Serif 4", "Source Serif 4 Variable", serif', bodyFamily: '"Inter"' }

const CONTENT_CHROME: Record<string, BlockSpec> = {
  tracker: placePx(band('accent'), 96, 40, 120, 12),
  'title-rule': placePx(band('line'), 96, 222, 1728, 2),
  'foot-rule': placePx(band('line'), 96, 1022, 1728, 2),
}

const MASTERS: MasterSpec[] = [
  {
    // a navy spine and a teal hairline at the left edge, a navy bar over the footer: the cover keeps
    // a light page, so every block reads its accent (title, CTA) on the colour it was made for
    name: 'cover',
    blocks: {
      spine: placePx(band('accent'), 0, 0, 72, 1080),
      'spine-teal': placePx(band('accent2'), 72, 0, 10, 1080),
      'foot-bar': placePx(band('accent'), 96, 1000, 240, 8),
    },
    background: { type: 'solid', color: 'theme:surface' },
  },
  {
    name: 'section',
    // a navy section page with a teal edge; the minimal divider's text solves to white on it
    blocks: { teal: placePx(band('accent2'), 0, 0, 16, 1080), 'foot-bar': placePx(band('accent2'), 96, 1000, 240, 8) },
    background: { type: 'solid', color: 'theme:accent1' },
  },
  { name: 'content', blocks: CONTENT_CHROME, background: { type: 'solid', color: 'theme:background' } },
]

export const CONSULTING_STYLE: DeckStyle = {
  id: 'consulting',
  family: 'professional',
  name: 'Consulting',
  brief:
    'Consulting deck: white pages, serif action titles that state the insight, navy with teal, square ' +
    'corners, hairline outlines, dense but structured, no motion.',
  palettes: [
    {
      id: 'consulting-ink',
      name: 'Consulting Ink',
      colors: {
        background: '#FFFFFF',
        surface: '#F2F4F8',
        text: '#111827',
        textMuted: '#4B5563',
        accent1: '#00205B',
        accent2: '#2BB3A3',
        positive: '#15803D',
        negative: '#B91C1C',
        warning: '#B45309',
      },
      fonts: FONTS,
      shapeDefaults: { isFilled: false, cornerRadius: 0 },
    },
  ],
  fonts: {
    heading: { family: 'Source Serif 4', fallback: FontStyle.Serif, metricsKey: 'source-serif-4' },
    body: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' },
  },
  tokens: {
    radius: { sm: 0, md: 0, lg: 2, xl: 2 },
    type: { display: { size: 120, lineHeight: 1.04 }, title: { size: 72, lineHeight: 1.08 }, heading: { size: 60, lineHeight: 1.12 } },
  },
  surface: { card: 'outline', stroke: 'hairline', shadow: 0 },
  masters: MASTERS,
  motionStyle: 'static',
  blockDefaults: {
    'tls.c.cover': { variant: 'centered', decoration: 'none' },
    'tls.c.divider': { variant: 'minimal', align: 'start' },
    'tls.t.title': { size: 'heading' },
    'tls.c.cards': { lead: 'number', align: 'start' },
    'tls.c.agenda': { numbering: 'badge' },
    'tls.c.chart-insight': { side: 'right', showSource: true },
    'tls.d.table': { rules: 'head', header: 'bold', zebra: false },
    'tls.t.quote': { markStyle: 'rule' },
    'tls.t.takeaway': { tone: 'accent' },
    'tls.c.closing': { variant: 'centered' },
    'tls.g.pros-cons': { style: 'columns' },
  },
  prefer: ['tls.g.swot', 'tls.d.waterfall', 'tls.d.stacked-bar', 'tls.d.scorecard'],
  avoid: ['tls.c.kinetic-title', 'tls.m.decoration', 'tls.m.image-grid'],
  rules: [
    'Action titles: one full sentence that states the insight.',
    'A source on every data slide.',
    'One message per slide; structure over decoration.',
  ],
}
