/**
 * tls.d.bubble — scatter plot whose circle sizes show a third value (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDBubble: BlockDefinition = {
  type: 'tls.d.bubble',
  name: 'Bubble Chart',
  family: 'data',
  tier: 'A',
  summary: 'Scatter plot with circle area for a third value, optional labels and size legend.',
  keywords: ['bubble', 'portfolio', 'three variables', 'size', 'market', 'scatter'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Scatter plot whose circle sizes show a third value',
  related: ['tls.d.scatter', 'tls.d.bar'],
  describe: {
    when: 'Portfolio views (market size by growth by share).',
    avoid: 'Two measures only (use tls.d.scatter).',
    example: {
      id: 'b_bubble',
      type: 'tls.d.bubble',
      props: {
        points: [
          { x: 12, y: 6, r: 30, label: 'EMEA' },
          { x: 30, y: 21, r: 90, label: 'APAC' },
          { x: 52, y: 13, r: 50, label: 'AMER' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [820, 500], min: [340, 240] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
