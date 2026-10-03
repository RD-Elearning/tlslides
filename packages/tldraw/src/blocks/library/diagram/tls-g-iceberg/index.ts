/**
 * tls.g.iceberg — visible symptoms above the waterline, hidden causes below it (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGIceberg: BlockDefinition = {
  type: 'tls.g.iceberg',
  name: 'Iceberg',
  family: 'diagram',
  tier: 'A',
  summary: 'An iceberg split at the waterline: a few visible items on the tip, more hidden items underneath.',
  keywords: ['iceberg', 'hidden', 'visible', 'symptoms', 'root causes', 'waterline'],
  category: 'comparison',
  scope: 'group',
  shortDescription: 'Iceberg split at the waterline into visible and hidden items',
  related: ['tls.g.pros-cons', 'tls.g.before-after'],
  describe: {
    when: 'Contrast of the visible (symptoms, results) against the hidden (causes, effort).',
    avoid: 'Two equal sides (use tls.g.pros-cons).',
    example: {
      id: 'b_iceberg',
      type: 'tls.g.iceberg',
      props: {
        above: { label: 'Seen', items: ['Late deliveries'] },
        below: { label: 'Hidden', items: ['Unclear ownership', 'Manual handoffs'] },
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
