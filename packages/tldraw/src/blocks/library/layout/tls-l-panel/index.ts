/**
 * tls.l.panel — a card whose surface is a choice of the deck's colour roles (sprint 2026-11b S11-c/d).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'
import { label } from '../_example'

export const tlsLPanel: BlockDefinition = {
  type: 'tls.l.panel',
  name: 'Panel',
  family: 'layout',
  tier: 'A',
  summary: 'A card in one of the deck surfaces (base, alt, accent, inverted, glass, outline), with an optional accent band.',
  keywords: ['panel', 'card', 'band', 'accent', 'inverted', 'surface'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Card in a chosen deck surface, with an optional accent band',
  related: ['tls.l.card'],
  describe: {
    when:
      "Container: a padded panel whose surface is one of the deck's roles — an accent or inverted panel for the one focal number or claim, alt or outline for side notes, base for peers. Two or more children are stacked.",
    avoid: 'More than one accent or inverted panel on a slide; a panel around a single decoration.',
    example: {
      id: 'b_panel',
      type: 'tls.l.panel',
      props: { surface: 'accent', emphasis: 'none', padding: 'lg', children: [label('b_panel_1', '42%'), { id: 'b_panel_2', type: 'tls.t.body', props: { text: 'of first-year students change their major once.' } }] },
    },
  },
  schema,
  defaults,
  size: { preferred: [640, 300], min: [360, 240] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
