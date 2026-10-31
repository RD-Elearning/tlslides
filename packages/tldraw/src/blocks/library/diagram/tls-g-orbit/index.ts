/**
 * tls.g.orbit — one concept in the centre, 3-8 satellites with icons around it (vivid V4).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGOrbit: BlockDefinition = {
  type: 'tls.g.orbit',
  name: 'Orbit',
  family: 'diagram',
  tier: 'A',
  summary: 'A concept on a central disc with 3-8 satellites (icon discs) on an orbit around it, each with a label and a note.',
  keywords: ['orbit', 'satellites', 'around', 'ecosystem', 'factors', 'stakeholders', 'centre', 'radial', 'planet'],
  category: 'relationship',
  scope: 'group',
  shortDescription: 'A centre with satellites around it on an orbit',
  related: ['tls.g.hub-spoke', 'tls.g.cycle', 'tls.g.mindmap'],
  describe: {
    when: 'Peers that all relate to one centre, with no order between them: the factors that shape a learner, the stakeholders of a project, the parts of an ecosystem.',
    avoid: 'Steps that repeat in order (use tls.g.cycle); branches with sub-branches (use tls.g.mindmap); a centre with long notes per spoke (use tls.g.hub-spoke).',
    example: {
      id: 'b_orbit',
      type: 'tls.g.orbit',
      props: {
        center: 'Healthy plant',
        centerIcon: 'plant',
        items: [
          { label: 'Light', icon: 'sun' },
          { label: 'Water', icon: 'droplet' },
          { label: 'Soil', icon: 'leaf' },
          { label: 'Air', icon: 'wind' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 600], min: [700, 400] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
