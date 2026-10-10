import { FontStyle } from '~types'
import { placePx } from './_place'
import type { DeckStyle } from '../types'

/**
 * AC1 pilot — Modern & Digital "Linear Gradient" (`reviews/blocks/ai-curation/README.md` §3.3).
 * Backgrounds are linear gradients in the palette's own colours (theme sentinels, so both palettes
 * work). AC4: every master adds the `mesh` glows and `grain` (full-frame backdrop blocks, painted on
 * the page by `deckSpecToDocument`), the section one `orb` in its free right half; cards are
 * filled with a hairline edge and shadow 1.
 */
const MESH = (opacity: 'soft' | 'medium') => ({ id: 'style-mesh', type: 'tls.m.pattern', props: { pattern: 'mesh', opacity, scale: 'md' } })
const GRAIN = { id: 'style-grain', type: 'tls.m.pattern', props: { pattern: 'grain', tone: 'line', opacity: 'soft', scale: 'md' } }
export const GRADIENT_STYLE: DeckStyle = {
  id: 'gradient',
  family: 'modern',
  name: 'Gradient',
  brief:
    'Modern product deck: dark slides washed with a violet-to-cyan gradient, big tight headlines, rounded ' +
    'cards, expressive motion. Dark first; one glow per slide.',
  palettes: [
    {
      id: 'gradient-night',
      name: 'Gradient Night',
      colors: {
        background: '#08090D',
        surface: '#1A1733',
        text: '#EDEEF3',
        textMuted: '#A3A7BA',
        accent1: '#8B6CFF',
        accent2: '#22D3EE',
        positive: '#34D399',
        negative: '#F87171',
        warning: '#FBBF24',
      },
      fonts: { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Variable", sans-serif', bodyFamily: '"Inter"' },
      shapeDefaults: { isFilled: true, cornerRadius: 24 },
    },
    {
      id: 'gradient-dawn',
      name: 'Gradient Dawn',
      colors: {
        background: '#FAFAFC',
        surface: '#ECE9FE',
        text: '#0B0B12',
        textMuted: '#555770',
        accent1: '#6D5DF6',
        accent2: '#DB2777',
        positive: '#0E9F6E',
        negative: '#DC2626',
        warning: '#B45309',
      },
      fonts: { heading: FontStyle.Sans, body: FontStyle.Sans, headingFamily: '"Plus Jakarta Sans", "Plus Jakarta Sans Variable", sans-serif', bodyFamily: '"Inter"' },
      shapeDefaults: { isFilled: true, cornerRadius: 24 },
    },
  ],
  fonts: {
    heading: { family: 'Plus Jakarta Sans', fallback: FontStyle.Sans, metricsKey: 'plus-jakarta-sans' },
    body: { family: 'Inter', fallback: FontStyle.Sans, metricsKey: 'inter' },
  },
  tokens: {
    radius: { sm: 12, md: 24, lg: 32, xl: 40 },
    type: { display: { size: 160, lineHeight: 1.0 }, title: { size: 96, lineHeight: 1.04 } },
  },
  surface: { card: 'filled', stroke: 'hairline', shadow: 1 },
  masters: [
    {
      name: 'cover',
      blocks: { mesh: MESH('medium'), grain: GRAIN },
      background: {
        type: 'linearGradient',
        angle: 135,
        stops: [
          { color: 'theme:background', at: 0 },
          { color: 'theme:surface', at: 0.55 },
          { color: 'theme:accent1', at: 1 },
        ],
      },
    },
    {
      name: 'section',
      // the divider is flush left: the orb sits in the free right part. AC8: placed at 1290..1810
      // (it filled image-right's `image` region from x ≈ 800 and a long section title ran into it)
      blocks: {
        mesh: MESH('medium'),
        grain: GRAIN,
        'orb-a': placePx({ id: 'style-orb', type: 'tls.m.decoration', props: { shape: 'orb', tone: 'accent', opacity: 'strong' } }, 1290, 250, 520, 520),
      },
      background: {
        type: 'linearGradient',
        angle: 120,
        stops: [
          { color: 'theme:surface', at: 0 },
          { color: 'theme:background', at: 1 },
        ],
      },
    },
    {
      name: 'content',
      blocks: { mesh: MESH('soft'), grain: GRAIN },
      background: {
        type: 'linearGradient',
        angle: 160,
        stops: [
          { color: 'theme:background', at: 0 },
          { color: 'theme:background', at: 0.45 },
          { color: 'theme:surface', at: 1 },
        ],
      },
    },
  ],
  motionStyle: 'expressive',
  blockDefaults: {
    'tls.c.cover': { variant: 'centered', decoration: 'none' },
    'tls.c.hero': { variant: 'gradient-sweep' },
    'tls.c.divider': { variant: 'numeral', align: 'start' },
    'tls.c.cards': { tone: 'surface', lead: 'icon' },
    'tls.c.chart-insight': { side: 'right' },
    'tls.t.quote': { markStyle: 'glyph' },
    'tls.t.takeaway': { tone: 'accent' },
    'tls.c.closing': { variant: 'centered' },
    'tls.g.chevrons': { fill: 'gradient' },
  },
  variety: {
    'tls.t.title': { align: ['start', 'center'], rule: [false, true] },
    'tls.c.hero': { variant: ['classic', 'split'] },
    'tls.c.cover': { variant: ['bleed'] },
    'tls.c.divider': { variant: ['minimal'] },
    'tls.c.cards': { tone: ['accent-first'], lead: ['number'] },
    'tls.c.chart-insight': { side: ['left', 'below'] },
    'tls.c.closing': { variant: ['big-type', 'split'] },
  },
  prefer: ['tls.m.device-mock'],
  avoid: ['tls.d.scatter', 'tls.d.heatmap'],
  rules: ['Dark first; one glow per slide.', 'Short, big headlines.', 'Cards over bare text for lists.'],
}
