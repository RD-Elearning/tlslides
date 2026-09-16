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

export const tlsLCard: BlockDefinition = {
  type: 'tls.l.card',
  name: 'Card',
  family: 'layout',
  tier: 'A',
  summary: 'Filled container with configurable padding.',
  keywords: ['card', 'container', 'padding', 'filled'],
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
