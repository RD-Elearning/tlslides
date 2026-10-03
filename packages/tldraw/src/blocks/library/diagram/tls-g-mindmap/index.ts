/**
 * tls.g.mindmap — a central idea with curved branches out to topics and subtopics (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGMindmap: BlockDefinition = {
  type: 'tls.g.mindmap',
  name: 'Mind Map',
  family: 'diagram',
  tier: 'A',
  summary: 'A central idea with 2-6 curved branches to topics, each with up to four subtopics.',
  keywords: ['mind map', 'mindmap', 'brainstorm', 'topics', 'overview', 'branches'],
  category: 'hierarchy',
  scope: 'group',
  shortDescription: 'Central idea with curved branches out to topics and subtopics',
  related: ['tls.g.tree', 'tls.g.hub-spoke'],
  describe: {
    when: 'Parent/child brainstorm: a topic overview or course map around one idea.',
    avoid: 'Formal reporting lines or strict hierarchies (use tls.g.tree).',
    example: {
      id: 'b_mindmap',
      type: 'tls.g.mindmap',
      props: {
        center: 'Launch plan',
        branches: [
          { label: 'Product', children: ['Scope'] },
          { label: 'Marketing', children: ['Channels'] },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 620], min: [600, 340] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
