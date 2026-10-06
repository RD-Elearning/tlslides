/**
 * tls.l.card — filled container with padding.
 *
 * Renders a filled background rectangle and lays out children
 * inside the padded content area.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'
import { label } from '../_example'

export const tlsLCard: BlockDefinition = {
  type: 'tls.l.card',
  name: 'Card',
  family: 'layout',
  tier: 'A',
  summary: 'Filled container with configurable padding.',
  keywords: ['card', 'container', 'padding', 'filled'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Filled, rounded panel around its children',
  related: ['tls.l.section'],
  describe: {
    when:
      'Container: wrap child blocks (props.children; two or more are stacked) in a filled, padded panel. Use to group a heading and a paragraph into one visible tile.',
    avoid: 'Do not use for transparent grouping (use tls.l.stack without style) or for a titled area with a divider (use tls.l.section).',
    example: {
      id: 'b_card',
      type: 'tls.l.card',
      props: { padding: 'md', children: [label('b_card_1', 'Revenue up 42%'), { id: 'b_card_2', type: 'tls.t.body', props: { text: 'Driven by enterprise accounts in APAC.' } }] },
    },
  },
  schema,
  defaults,
  size: { preferred: [640, 300], min: [360, 260] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
