/**
 * tls.g.hub-spoke — a central hub with satellite nodes on connecting lines (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGHubSpoke: BlockDefinition = {
  type: 'tls.g.hub-spoke',
  name: 'Hub and Spoke',
  family: 'diagram',
  tier: 'A',
  summary: 'A central hub with 3-8 satellite cards on connecting lines, full circle or fanned over a half circle.',
  keywords: ['hub', 'spoke', 'ecosystem', 'satellites', 'core', 'modules', 'stakeholders'],
  category: 'relationship',
  scope: 'group',
  shortDescription: 'Central hub with satellite nodes radiating out on connecting lines',
  related: ['tls.g.venn', 'tls.g.cycle', 'tls.g.tree'],
  describe: {
    when: 'Centre/satellite: an ecosystem, stakeholders around a product, a core with modules.',
    avoid: 'Ordered loops (use tls.g.cycle) or parent/child levels (use tls.g.tree).',
    example: {
      id: 'b_hub',
      type: 'tls.g.hub-spoke',
      props: {
        hub: { label: 'Platform' },
        spokes: [{ label: 'Web' }, { label: 'Mobile' }, { label: 'API' }],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 600], min: [600, 340] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
