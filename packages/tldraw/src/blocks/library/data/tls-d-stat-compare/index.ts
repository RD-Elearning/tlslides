/**
 * tls.d.stat-compare — two numbers side by side with the change between them (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsDStatCompare: BlockDefinition = {
  type: 'tls.d.stat-compare',
  name: 'Stat Compare',
  family: 'data',
  tier: 'A',
  summary: 'Two labelled numbers with a connector and a coloured change pill (percent or absolute).',
  keywords: ['compare', 'before', 'after', 'versus', 'change', 'delta', 'year'],
  category: 'metric',
  scope: 'group',
  shortDescription: 'Two numbers side by side with the change between them',
  related: ['tls.c.kpi-row', 'tls.d.bar'],
  describe: {
    when: 'Before vs after, last year vs this year, us vs benchmark.',
    avoid: 'More than two values (use tls.c.kpi-row or tls.d.bar).',
    example: {
      id: 'b_stat_compare',
      type: 'tls.d.stat-compare',
      props: {
        left: { label: '2024', value: 4200 },
        right: { label: '2025', value: 5460 },
        format: 'compact',
        caption: 'Annual revenue',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [880, 320], min: [260, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
