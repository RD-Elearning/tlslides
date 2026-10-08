/**
 * tls.d.slope — lines connecting two time points per item, showing who rose or fell (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDSlope: BlockDefinition = {
  type: 'tls.d.slope',
  name: 'Slope Chart',
  family: 'data',
  tier: 'A',
  summary: 'Slope chart: one line per item between a start and an end column, with values and names.',
  keywords: ['slope', 'before after', 'rank change', 'two points', 'rise', 'fall'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Lines connecting two time points per item, showing who rose or fell',
  related: ['tls.d.line', 'tls.d.grouped-bar'],
  describe: {
    when: 'Change between exactly two points for several items.',
    avoid: 'Many time points (use tls.d.line).',
    example: {
      id: 'b_slope',
      type: 'tls.d.slope',
      props: {
        startLabel: '2023',
        endLabel: '2025',
        items: [
          { name: 'North', start: 40, end: 58 },
          { name: 'South', start: 55, end: 47 },
        ],
        highlight: 'risers',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [760, 460], min: [260, 180] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
