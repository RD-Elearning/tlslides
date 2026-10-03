/**
 * tls.d.waterfall — running total built up from increases and decreases between two totals (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDWaterfall: BlockDefinition = {
  type: 'tls.d.waterfall',
  name: 'Waterfall Chart',
  family: 'data',
  tier: 'A',
  summary: 'Bridge chart: floating bars for changes, full bars for totals, optional connectors.',
  keywords: ['waterfall', 'bridge', 'variance', 'walk', 'revenue', 'budget'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Running total built up from increases and decreases between two totals',
  related: ['tls.d.bar', 'tls.d.stacked-bar'],
  describe: {
    when: 'Bridge from one figure to another (revenue bridge, budget variance).',
    avoid: 'Independent values (use tls.d.bar).',
    example: {
      id: 'b_waterfall',
      type: 'tls.d.waterfall',
      props: {
        steps: [
          { label: 'Start', value: 100, kind: 'total' },
          { label: 'Growth', value: 30 },
          { label: 'Churn', value: -15 },
          { label: 'End', value: 115, kind: 'total' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 480], min: [260, 180] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
