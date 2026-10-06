/**
 * tls.d.heatmap — grid of cells shaded by value.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDHeatmap: BlockDefinition = {
  type: 'tls.d.heatmap',
  name: 'Heatmap',
  family: 'data',
  tier: 'A',
  summary: 'Rows by columns of cells shaded by value, with optional numbers and a legend.',
  keywords: ['heatmap', 'matrix', 'intensity', 'grid', 'correlation', 'weekday hour'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Grid of cells shaded by value, rows by columns',
  related: ['tls.d.table', 'tls.d.grouped-bar'],
  describe: {
    when: 'Patterns across two dimensions (weekday by hour, team by skill).',
    avoid: 'Exact values (tls.d.table). One dimension: tls.d.bar.',
    example: {
      id: 'b_heatmap',
      type: 'tls.d.heatmap',
      props: {
        rows: ['Mon', 'Tue', 'Wed', 'Thu'],
        cols: ['Morning', 'Afternoon', 'Evening'],
        values: [[3, 8, 5], [4, 9, 2], [6, 7, 3], [2, 5, 9]],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 420], min: [320, 180] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
