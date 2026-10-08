/**
 * tls.d.donut — donut chart visualization.
 *
 * Phase 6.1: One exemplar for chart family.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsDDonut: BlockDefinition = {
  type: 'tls.d.donut',
  name: 'Donut Chart',
  family: 'data',
  tier: 'A',
  summary: 'Ring of up to six slices with a legend or outside labels, percentages and an optional centre value.',
  keywords: ['chart', 'donut', 'ring', 'share', 'proportion', 'whole', 'percent'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Ring of slices showing shares of a whole, with a centre value',
  related: ['tls.d.pie', 'tls.d.bar', 'tls.d.progress-ring'],
  describe: {
    when: 'Share of a whole with 2-6 parts and one number worth printing in the middle (a total, a count).',
    avoid: 'Many or similar-sized parts (use tls.d.bar); one rate (use tls.d.progress-ring); exact figures (use tls.d.table).',
    example: {
      id: 'b_donut_1',
      type: 'tls.d.donut',
      props: {
        slices: [
          { label: 'Subscriptions', value: 48 },
          { label: 'Services', value: 27 },
          { label: 'Licences', value: 17 },
          { label: 'Other', value: 8 },
        ],
        centerValue: '$4.2M',
        centerLabel: 'Revenue',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [760, 460], min: [320, 220] },
  layout: layout as BlockDefinition['layout'],
  motion,
}