/**
 * tls.d.trend-badge — small pill with an up or down arrow and a change value (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsDTrendBadge: BlockDefinition = {
  type: 'tls.d.trend-badge',
  name: 'Trend Badge',
  family: 'data',
  tier: 'A',
  summary: 'Pill with a triangle arrow and a signed change, coloured by direction and polarity.',
  keywords: ['trend', 'badge', 'delta', 'change', 'arrow', 'up', 'down'],
  category: 'metric',
  scope: 'element',
  shortDescription: 'Small pill with an up or down arrow and a change value',
  related: ['tls.c.kpi-tile', 'tls.d.stat-compare'],
  describe: {
    when: 'Annotating a number elsewhere on the slide with its trend.',
    avoid: 'A standalone metric (use tls.c.kpi-tile).',
    example: {
      id: 'b_trend',
      type: 'tls.d.trend-badge',
      props: { delta: -3.2, format: 'percent', polarity: 'downGood', label: 'churn' },
    },
  },
  schema,
  defaults,
  size: { preferred: [320, 64], min: [100, 28] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
