/**
 * tls.d.sparkline — tiny axis-free line showing a trend, with the last value marked (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDSparkline: BlockDefinition = {
  type: 'tls.d.sparkline',
  name: 'Sparkline',
  family: 'data',
  tier: 'A',
  summary: 'Axis-free trend line with optional label, area tint, end dot and last value or change.',
  keywords: ['sparkline', 'trend', 'mini chart', 'inline', 'tile'],
  category: 'chart',
  scope: 'element',
  shortDescription: 'Tiny axis-free line showing a trend, with the last value marked',
  related: ['tls.d.line', 'tls.c.kpi-tile'],
  describe: {
    when: 'A trend hint next to a number, in tables or tiles.',
    avoid: 'A chart someone must read values from (use tls.d.line).',
    example: {
      id: 'b_spark',
      type: 'tls.d.sparkline',
      props: { values: [4, 6, 5, 8, 9, 12], label: 'Signups', showLast: 'delta' },
    },
  },
  schema,
  defaults,
  size: { preferred: [420, 90], min: [120, 36] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
