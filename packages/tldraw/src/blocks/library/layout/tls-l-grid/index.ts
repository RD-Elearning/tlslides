/**
 * tls.l.grid — grid with columns/rows.
 *
 * Arranges children in a grid with configurable column count, row count, and gap.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLGrid: BlockDefinition = {
  type: 'tls.l.grid',
  name: 'Grid',
  family: 'layout',
  tier: 'A',
  summary: 'Grid layout with configurable columns, rows, and gap.',
  keywords: ['grid', 'columns', 'rows', 'table'],
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
