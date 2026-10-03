/**
 * tls.t.kv-list — key and value pairs in two aligned columns, with optional leaders.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsTKvList: BlockDefinition = {
  type: 'tls.t.kv-list',
  name: 'Key-value list',
  family: 'text',
  tier: 'A',
  summary: 'Key and value pairs in aligned columns, with dotted or ruled leaders.',
  keywords: ['specs', 'facts', 'key value', 'details', 'schedule', 'terms'],
  category: 'list',
  scope: 'element',
  shortDescription: 'Key and value pairs in two aligned columns, with optional dotted leaders',
  related: ['tls.t.bullets', 'tls.t.definition'],
  describe: {
    when: 'Specs, facts, terms and conditions, a schedule of times.',
    avoid: 'Multi-column data (use tls.d.table).',
    example: {
      id: 'b_kv',
      type: 'tls.t.kv-list',
      props: {
        items: [
          { key: 'Start', value: '09:00' },
          { key: 'Break', value: '10:30' },
          { key: 'Finish', value: '12:00' },
        ],
        leader: 'rule',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 360], min: [260, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
