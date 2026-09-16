/**
 * tls.l.stack — vertical stack with gap.
 *
 * Distributes child blocks vertically, each spanning the full width,
 * separated by a configurable gap token.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLStack: BlockDefinition = {
  type: 'tls.l.stack',
  name: 'Stack',
  family: 'layout',
  tier: 'A',
  summary: 'Vertical stack with gap.',
  keywords: ['stack', 'vertical', 'column', 'gap'],
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
