/**
 * tls.l.repeater — repeats template for each item.
 *
 * Lays out a template child `count` times in a given direction,
 * with configurable gap. Falls back to placeholder rects when no
 * template is provided.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLRepeater: BlockDefinition = {
  type: 'tls.l.repeater',
  name: 'Repeater',
  family: 'layout',
  tier: 'A',
  summary: 'Repeats a template child for each item in a given direction.',
  keywords: ['repeater', 'repeat', 'loop', 'list'],
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
