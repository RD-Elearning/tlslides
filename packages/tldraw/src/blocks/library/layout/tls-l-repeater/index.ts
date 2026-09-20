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
  describe: {
    when: 'Use to lay out the same template block N times in a row or column.',
    avoid: 'Do not use when children are all different — use tls.l.stack or tls.l.grid.',
    example: {
      id: 'b_rep',
      type: 'tls.l.repeater',
      props: { count: 3, direction: 'y', gap: 'sm' },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
