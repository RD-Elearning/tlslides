/**
 * tls.d.progress-ring — one value shown as a ring filled to a percentage (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsDProgressRing: BlockDefinition = {
  type: 'tls.d.progress-ring',
  name: 'Progress Ring',
  family: 'data',
  tier: 'A',
  summary: 'Ring filled to value / max with the figure in the centre, plus label and caption.',
  keywords: ['progress', 'ring', 'dial', 'percent', 'completion', 'score'],
  category: 'metric',
  scope: 'element',
  shortDescription: 'Ring filled to a percentage with the number in the centre',
  related: ['tls.d.donut', 'tls.d.progress-bar'],
  describe: {
    when: 'One completion rate or score shown as a dial.',
    avoid: 'Shares of several parts (use tls.d.donut); several bars (use tls.d.progress-bar).',
    example: {
      id: 'b_ring',
      type: 'tls.d.progress-ring',
      props: { value: 68, label: 'Course completion', caption: '34 of 50 lessons', tone: 'status' },
    },
  },
  schema,
  defaults,
  size: { preferred: [360, 420], min: [120, 140] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
