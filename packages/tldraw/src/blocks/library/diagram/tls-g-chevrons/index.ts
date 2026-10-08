/**
 * tls.g.chevrons — arrow-shaped phases in a row, one optionally highlighted as current (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGChevrons: BlockDefinition = {
  type: 'tls.g.chevrons',
  name: 'Chevron Process',
  family: 'diagram',
  tier: 'A',
  summary: 'Phases as nested arrow segments in a row, with a "we are here" highlight.',
  keywords: ['chevrons', 'phases', 'process', 'arrows', 'stages', 'method'],
  category: 'process',
  scope: 'group',
  shortDescription: 'Arrow-shaped chevron segments in a row, one highlighted as the current phase',
  related: ['tls.g.steps', 'tls.c.steps'],
  describe: {
    when: 'Order: phases of a project or method, with an optional "we are here".',
    avoid: 'Steps that need descriptions longer than one line (use tls.c.steps). Dated phases go in tls.g.roadmap.',
    example: {
      id: 'b_chevrons',
      type: 'tls.g.chevrons',
      props: {
        steps: [
          { label: 'Discover', text: 'Research the need' },
          { label: 'Design', text: 'Shape the concept' },
          { label: 'Build', text: 'Make it real' },
          { label: 'Launch', text: 'Release and learn' },
        ],
        currentIndex: 1,
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 300], min: [600, 160] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
