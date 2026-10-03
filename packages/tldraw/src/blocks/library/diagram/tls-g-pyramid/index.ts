/**
 * tls.g.pyramid — stacked levels from tip to base, each with label and note (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGPyramid: BlockDefinition = {
  type: 'tls.g.pyramid',
  name: 'Pyramid',
  family: 'diagram',
  tier: 'A',
  summary: 'Stacked pyramid levels from tip to base, each with a label and a note; can be inverted.',
  keywords: ['pyramid', 'levels', 'tiers', 'maslow', 'hierarchy of needs', 'foundation'],
  category: 'hierarchy',
  scope: 'group',
  shortDescription: 'Stacked pyramid levels from base to tip, each with label and note',
  related: ['tls.g.funnel', 'tls.g.chevrons'],
  describe: {
    when: 'Level: ranked tiers that build on each other, such as Maslow, priority tiers or foundation-to-goal stacks.',
    avoid: 'Equal-weight layers (use tls.g.layers) or a narrowing process (use tls.g.funnel).',
    example: {
      id: 'b_pyramid',
      type: 'tls.g.pyramid',
      props: {
        levels: [
          { label: 'Purpose', text: 'Why we exist' },
          { label: 'Strategy', text: 'Where we play' },
          { label: 'Operations', text: 'How we deliver every day' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 560], min: [560, 320] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
