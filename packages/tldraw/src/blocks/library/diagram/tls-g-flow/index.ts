/**
 * tls.g.flow — flowchart of boxes and decisions joined by labelled arrows (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity, lint } from './layout'
import { motion } from './motion'

export const tlsGFlow: BlockDefinition = {
  type: 'tls.g.flow',
  name: 'Flowchart',
  family: 'diagram',
  tier: 'A',
  summary: 'Flowchart: steps, decisions, start and end joined by labelled arrows; unknown ids are reported.',
  keywords: ['flowchart', 'flow', 'decision', 'branch', 'algorithm', 'approval'],
  category: 'process',
  scope: 'group',
  shortDescription: 'Flowchart of boxes and decisions joined by labelled arrows',
  related: ['tls.g.steps', 'tls.g.chevrons', 'tls.g.cycle', 'tls.g.tree'],
  describe: {
    when: 'Order with branches: decision logic, algorithms, approval paths.',
    avoid: 'A straight sequence (use tls.g.steps or tls.g.chevrons).',
    example: {
      id: 'b_flow',
      type: 'tls.g.flow',
      props: {
        nodes: [
          { id: 'a', label: 'Request', kind: 'start' },
          { id: 'b', label: 'Valid?', kind: 'decision' },
          { id: 'c', label: 'Process' },
          { id: 'd', label: 'Reject', kind: 'end' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c', label: 'Yes' },
          { from: 'b', to: 'd', label: 'No' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1400, 520], min: [640, 320] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
  lint: lint as BlockDefinition['lint'],
}
