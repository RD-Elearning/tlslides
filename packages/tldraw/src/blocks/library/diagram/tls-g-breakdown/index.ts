/**
 * tls.g.breakdown — one whole split into parts under a bracket (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGBreakdown: BlockDefinition = {
  type: 'tls.g.breakdown',
  name: 'Breakdown',
  family: 'diagram',
  tier: 'A',
  summary: 'One whole box split into 2-6 parts with values, joined by a curly brace; can show each share.',
  keywords: ['breakdown', 'split', 'components', 'cost', 'composition', 'parts of a whole'],
  category: 'hierarchy',
  scope: 'group',
  shortDescription: 'One whole split into parts with values, shown as a bracketed breakdown',
  related: ['tls.g.tree', 'tls.d.pie'],
  describe: {
    when: 'Parent/child, one level: a cost breakdown or the components of one metric.',
    avoid: 'Several levels (use tls.g.tree) or exact proportions to read off (use tls.d.pie).',
    example: {
      id: 'b_breakdown',
      type: 'tls.g.breakdown',
      props: {
        whole: { label: 'Total cost', value: '$120k' },
        parts: [
          { label: 'People', value: '$70k' },
          { label: 'Cloud', value: '$30k' },
          { label: 'Tools', value: '$20k' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 520], min: [560, 320] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
