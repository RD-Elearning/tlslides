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
          { x: 10, y: 5, r: 30, label: 'A' },
          { x: 30, y: 20, r: 90, label: 'B' },
          { x: 50, y: 12, r: 50, label: 'C' },
        ],
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
