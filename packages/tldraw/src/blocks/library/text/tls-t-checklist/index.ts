/**
 * tls.t.checklist — checklist of items, each ticked, open or crossed out.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsTChecklist: BlockDefinition = {
  type: 'tls.t.checklist',
  name: 'Checklist',
  family: 'text',
  tier: 'A',
  summary: 'Checklist with a done, open or blocked state per item.',
  keywords: ['checklist', 'todo', 'requirements', 'status', 'objectives'],
  category: 'list',
  scope: 'element',
  shortDescription: 'Checklist of items, each ticked, open or crossed out',
  related: ['tls.t.bullets', 'tls.t.numbered'],
  describe: {
    when: 'Requirements, prerequisites, launch checklists, learning objectives with a done state.',
    avoid: 'Plain points without a state (use tls.t.bullets); support across options (use tls.d.compare-table).',
    example: {
      id: 'b_checklist',
      type: 'tls.t.checklist',
      props: {
        items: [
          { text: 'Draft the outline', state: 'done' },
          { text: 'Review with the team', state: 'open' },
          { text: 'Legal approval', state: 'blocked' },
        ],
        doneStyle: 'strike',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 230], min: [420, 170] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
