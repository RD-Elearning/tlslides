/**
 * tls.g.cycle — steps on a ring with arrows looping back to the start (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGCycle: BlockDefinition = {
  type: 'tls.g.cycle',
  name: 'Cycle',
  family: 'diagram',
  tier: 'A',
  summary: 'Steps arranged on a ring with arrows that loop back to the first step.',
  keywords: ['cycle', 'loop', 'pdca', 'lifecycle', 'feedback', 'circular'],
  category: 'process',
  scope: 'group',
  shortDescription: 'Steps arranged on a circle with arrows looping back to the start',
  related: ['tls.g.chevrons', 'tls.g.steps', 'tls.g.hub-spoke'],
  describe: {
    when: 'Cycle: continuous loops such as PDCA, a product lifecycle or a feedback loop.',
    avoid: 'A process with a clear end (use tls.g.chevrons or tls.g.steps).',
    example: {
      id: 'b_cycle',
      type: 'tls.g.cycle',
      props: {
        steps: [
          { label: 'Plan', text: 'Set the goal' },
          { label: 'Do', text: 'Try the change' },
          { label: 'Check', text: 'Measure it' },
          { label: 'Act', text: 'Keep what works' },
        ],
        center: 'PDCA',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 620], min: [640, 440] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
