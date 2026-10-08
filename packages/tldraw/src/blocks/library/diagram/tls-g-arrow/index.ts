/**
 * tls.g.arrow — a standalone straight, curved or elbow arrow with an optional label (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsGArrow: BlockDefinition = {
  type: 'tls.g.arrow',
  name: 'Arrow',
  family: 'diagram',
  tier: 'A',
  summary: 'A single straight, curved or elbow arrow in four directions with one or two heads and an optional label.',
  keywords: ['arrow', 'pointer', 'connector', 'curved arrow', 'elbow', 'flow direction'],
  category: 'decoration',
  scope: 'element',
  shortDescription: 'Standalone straight, curved or elbow arrow with an optional label',
  related: ['tls.g.flow'],
  describe: {
    when: 'Pointing from one block to another on a free layout, with a word on the arrow.',
    avoid: 'Connecting steps in a process (use tls.g.flow, which draws its own connectors).',
    example: {
      id: 'b_arrow',
      type: 'tls.g.arrow',
      props: { label: 'Then', kind: 'curved' },
    },
  },
  schema,
  defaults,
  size: { preferred: [420, 160], min: [120, 60] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
