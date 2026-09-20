/**
 * tls.v.counter — animated numeric counter (Tier B).
 *
 * Phase 7: One exemplar for live family.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsVCounter: BlockDefinition = {
  type: 'tls.v.counter',
  name: 'Counter',
  family: 'visual',
  tier: 'B',
  summary: 'Animated numeric counter that interpolates between values.',
  keywords: ['counter', 'number', 'animate', 'count', 'live'],
  describe: {
    when: 'Use to animate numeric values on screen, like scores or stats.',
    avoid: 'Do not use for static text content.',
    example: {
      id: 'b_counter_1',
      type: 'tls.v.counter',
      props: {
        from: 0,
        to: 42,
        duration: 1.5,
      },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [100, 100], min: [50, 50] },
  layout: layout as BlockDefinition['layout'],
  motion,
}