/**
 * tls.d.table — table with a header row, aligned numbers, zebra rows and an emphasised row.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDTable: BlockDefinition = {
  type: 'tls.d.table',
  name: 'Table',
  family: 'data',
  tier: 'A',
  summary: 'Table with header, aligned numbers, status dots, ratings and a totals row.',
  keywords: ['table', 'grid', 'rows', 'columns', 'spreadsheet', 'schedule', 'specs'],
  category: 'table',
  scope: 'group',
  shortDescription: 'Table with header row, aligned numbers, zebra rows and an emphasised row',
  related: ['tls.t.kv-list'],
  describe: {
    when: 'Exact values in rows and columns (schedules, specs, results).',
    avoid: 'Fewer than 3 values (tls.c.kpi-row). Options vs criteria: tls.d.compare-table.',
    example: {
      id: 'b_table',
      type: 'tls.d.table',
      props: {
        columns: [{ label: 'Plan' }, { label: 'Seats', kind: 'number' }, { label: 'Price', kind: 'number' }],
        rows: [
          ['Starter', '5', '$49'],
          ['Team', '25', '$199'],
        ],
        footer: ['Total', '30', '$248'],
        zebra: true,
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 520], min: [320, 160] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
