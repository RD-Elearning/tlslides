/**
 * tls.g.before-after — two panels joined by an arrow, text or image in each (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGBeforeAfter: BlockDefinition = {
  type: 'tls.g.before-after',
  name: 'Before and After',
  family: 'diagram',
  tier: 'A',
  summary: 'Before and after panels joined by an arrow, each with a tag, title, text and optional image.',
  keywords: ['before', 'after', 'transformation', 'redesign', 'problem', 'solution', 'change'],
  category: 'comparison',
  scope: 'group',
  shortDescription: 'Before and after panels joined by an arrow, text or image in each',
  related: ['tls.g.pros-cons', 'tls.c.comparison'],
  describe: {
    when: 'Contrast over time: a transformation, redesign or problem turned into a solution.',
    avoid: 'Numeric before/after values (use tls.d.stat-compare).',
    example: {
      id: 'b_before_after',
      type: 'tls.g.before-after',
      props: {
        before: { label: 'Before', title: 'Manual reports' },
        after: { label: 'After', title: 'Live dashboard' },
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 520], min: [560, 300] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
