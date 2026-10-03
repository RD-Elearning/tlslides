/**
 * tls.d.bullet-chart — bars against target markers over qualitative range bands (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDBulletChart: BlockDefinition = {
  type: 'tls.d.bullet-chart',
  name: 'Bullet Chart',
  family: 'data',
  tier: 'A',
  summary: 'Per-KPI value bar with a target tick over shaded range bands, with labels and values.',
  keywords: ['bullet', 'target', 'kpi', 'actual vs target', 'performance'],
  category: 'metric',
  scope: 'group',
  shortDescription: 'Bars against target markers over qualitative range bands',
  related: ['tls.d.progress-bar', 'tls.d.bar', 'tls.d.scorecard'],
  describe: {
    when: 'Several KPIs each against its own target.',
    avoid: 'Progress with no target (use tls.d.progress-bar).',
    example: {
      id: 'b_bullet',
      type: 'tls.d.bullet-chart',
      props: {
        items: [
          { label: 'Revenue', value: 270, target: 300, max: 400 },
          { label: 'Margin', value: 22, target: 20, max: 30 },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [820, 340], min: [260, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
