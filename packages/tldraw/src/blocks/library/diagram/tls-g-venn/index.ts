/**
 * tls.g.venn — two or three overlapping circles with a label for the overlap (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGVenn: BlockDefinition = {
  type: 'tls.g.venn',
  name: 'Venn',
  family: 'diagram',
  tier: 'A',
  summary: 'Two or three overlapping translucent circles with set labels and a label for what they share.',
  keywords: ['venn', 'overlap', 'intersection', 'shared', 'circles', 'ikigai'],
  category: 'relationship',
  scope: 'group',
  shortDescription: 'Two or three overlapping circles with labels and a label for the overlap',
  related: ['tls.g.matrix-2x2'],
  describe: {
    when: 'Overlap: what two or three sets share, such as a skills/market intersection.',
    avoid: 'More than 3 sets (use tls.d.compare-table) or ranked levels (use tls.g.pyramid).',
    example: {
      id: 'b_venn',
      type: 'tls.g.venn',
      props: {
        sets: [{ label: 'Skills' }, { label: 'Passion' }],
        overlap: 'Sweet spot',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1000, 560], min: [560, 320] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
