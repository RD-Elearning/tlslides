/**
 * tls.l.grid — grid with columns/rows.
 *
 * Arranges children in a grid with configurable column count, row count, and gap.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'
import { tile } from '../_example'

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
    when:
      'Container: child blocks (props.children) in a columns x rows grid of equal cells. For 4-9 cells.',
    avoid: 'Two columns: tls.l.split. One line: tls.l.row.',
    example: {
      id: 'b_grid',
      type: 'tls.l.grid',
      props: { columns: 2, rows: 2, gap: 'md', children: [tile('c1', 'Reach'), tile('c2', 'Revenue'), tile('c3', 'Cost'), tile('c4', 'Risk')] },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 480], min: [400, 260] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
