/**
 * tls.l.split — two-panel split with ratio/gutter.
 *
 * Divides the box into two panels along an axis, with configurable
 * ratio and gutter spacing.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLSplit: BlockDefinition = {
  type: 'tls.l.split',
  name: 'Split',
  family: 'layout',
  tier: 'A',
  summary: 'Two-panel split with configurable ratio and gutter.',
  keywords: ['split', 'columns', 'two-panel', 'sidebar'],
  describe: {
    when: 'Use to divide a region into two panels (left/right or top/bottom).',
    avoid: 'Do not use for three or more panels — use tls.l.grid instead.',
    example: {
      id: 'b_split',
      type: 'tls.l.split',
      props: { ratio: 0.5, gutter: 'md', axis: 'x' },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
