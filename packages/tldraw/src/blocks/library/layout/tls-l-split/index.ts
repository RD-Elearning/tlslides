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
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
