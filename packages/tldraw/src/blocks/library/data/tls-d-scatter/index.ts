/**
 * tls.d.scatter — points on two numeric axes, optionally grouped, with quadrant lines (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDScatter: BlockDefinition = {
  type: 'tls.d.scatter',
  name: 'Scatter Plot',
  family: 'data',
  tier: 'A',
  summary: 'Points on nice x and y axes; group colours, quadrant lines, trend line, point labels.',
  keywords: ['scatter', 'correlation', 'xy', 'plot', 'quadrant', 'regression'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Points on two numeric axes, optionally grouped, with quadrant lines',
  related: ['tls.d.line', 'tls.d.bar', 'tls.d.bubble', 'tls.g.matrix-2x2'],
  describe: {
    when: 'Correlation, positioning of items on two measures.',
    avoid: 'Qualitative positioning (use tls.g.matrix-2x2).',
    example: {
      id: 'b_scatter',
      type: 'tls.d.scatter',
      props: {
        points: [
          { x: 12, y: 34, label: 'Basic' },
          { x: 24, y: 51, label: 'Plus' },
          { x: 38, y: 47, label: 'Pro' },
          { x: 55, y: 82, label: 'Max' },
        ],
        trendline: true,
        labelPoints: 'all',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [820, 500], min: [260, 180] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
