/**
 * tls.g.layers — stacked horizontal layers like a tech stack (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGLayers: BlockDefinition = {
  type: 'tls.g.layers',
  name: 'Layers',
  family: 'diagram',
  tier: 'A',
  summary: 'Stacked horizontal layers, each with a label, note and icon, flat or as slanted slabs.',
  keywords: ['layers', 'stack', 'architecture', 'tech stack', 'osi', 'tiers'],
  category: 'hierarchy',
  scope: 'group',
  shortDescription: 'Stacked horizontal layers like a tech stack, each with label and note',
  related: ['tls.g.pyramid', 'tls.g.tree'],
  describe: {
    when: 'Level: layered architectures and stacks such as app/services/data or the OSI model.',
    avoid: 'Narrowing or ranked levels (use tls.g.pyramid).',
    example: {
      id: 'b_layers',
      type: 'tls.g.layers',
      props: {
        layers: [
          { label: 'Application', text: 'What users touch' },
          { label: 'Services', text: 'Business logic' },
          { label: 'Data', text: 'Storage' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1000, 560], min: [560, 320] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
