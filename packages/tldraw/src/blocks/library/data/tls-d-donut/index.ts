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
  summary: 'Donut chart with colored slices.',
  keywords: ['chart', 'donut', 'pie', 'data', 'visualization'],
  describe: {
    when: 'Use to display proportional data in a donut chart format.',
    avoid: 'Do not use for detailed data tables — use a table or list instead.',
    example: {
      id: 'b_donut_1',
      type: 'tls.d.donut',
      props: {
        slices: [
          { value: 30, color: 'accent1' },
          { value: 25, color: 'accent2' },
          { value: 25, color: 'accent3' },
          { value: 20, color: 'accent4' },
        ],
        total: 100,
      },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [200, 200], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}