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
  category: 'structure',
  scope: 'element',
  shortDescription: 'Grid of child blocks in fixed columns and rows',
  related: ['tls.l.row', 'tls.l.repeater'],
  describe: {
    when: 'Use to arrange child blocks in a rows × columns grid.',
    avoid: 'Do not use for a simple two-column layout (use tls.l.split) or for one line of items (use tls.l.row).',
    example: {
      id: 'b_grid',
      type: 'tls.l.grid',
      props: { columns: 2, rows: 2, gap: 'md' },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
