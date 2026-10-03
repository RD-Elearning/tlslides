/**
 * tls.d.progress-bar — labelled horizontal bars showing progress toward a target (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDProgressBar: BlockDefinition = {
  type: 'tls.d.progress-bar',
  name: 'Progress Bars',
  family: 'data',
  tier: 'A',
  summary: 'Labelled bars filled to value / target, with percent or value text.',
  keywords: ['progress', 'completion', 'target', 'goal', 'bar', 'percent'],
  category: 'metric',
  scope: 'element',
  shortDescription: 'Labelled horizontal bars showing progress toward a target',
  related: ['tls.d.bar', 'tls.d.progress-ring'],
  describe: {
    when: 'Completion of goals, budgets spent, survey agreement levels.',
    avoid: 'Categories with no target (use tls.d.bar, horizontal); one big rate (use tls.d.progress-ring).',
    example: {
      id: 'b_progress',
      type: 'tls.d.progress-bar',
      props: {
        items: [
          { label: 'Hiring plan', value: 72 },
          { label: 'Budget', value: 41, max: 60 },
        ],
        tone: 'status',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [760, 300], min: [240, 90] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
