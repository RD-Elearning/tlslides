/**
 * tls.g.tree — org chart or hierarchy of boxes from one root (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGTree: BlockDefinition = {
  type: 'tls.g.tree',
  name: 'Tree',
  family: 'diagram',
  tier: 'A',
  summary: 'Org chart or hierarchy: a root box linked to children and grandchildren, top-down or left to right.',
  keywords: ['tree', 'org chart', 'hierarchy', 'taxonomy', 'breakdown', 'structure'],
  category: 'hierarchy',
  scope: 'group',
  shortDescription: 'Org chart or hierarchy of boxes linked from one root, top-down or left-right',
  related: ['tls.g.flow', 'tls.g.hub-spoke', 'tls.g.breakdown', 'tls.g.layers', 'tls.g.mindmap'],
  describe: {
    when: 'Parent/child: org charts, taxonomies, the decomposition of a goal into parts.',
    avoid: 'Ordered steps or decisions (use tls.g.flow) or free brainstorming (use tls.g.mindmap).',
    example: {
      id: 'b_tree',
      type: 'tls.g.tree',
      props: {
        root: {
          label: 'Goal',
          children: [
            { label: 'Grow revenue', children: [{ label: 'New markets' }, { label: 'Upsell' }] },
            { label: 'Cut cost', children: [{ label: 'Automate' }] },
          ],
        },
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 640], min: [600, 360] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
