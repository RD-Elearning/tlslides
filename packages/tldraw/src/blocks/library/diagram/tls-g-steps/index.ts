/**
 * tls.g.steps — numbered process diagram.
 *
 * Phase 6.1: One exemplar for diagram family.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsGSteps: BlockDefinition = {
  type: 'tls.g.steps',
  name: 'Steps Diagram',
  family: 'diagram',
  tier: 'A',
  summary: 'Numbered process diagram with animated step reveal.',
  keywords: ['steps', 'process', 'workflow', 'diagram', 'flow'],
  describe: {
    when: 'Use to illustrate a multi-step process or workflow.',
    avoid: 'Do not use for single concepts — use a heading or icon instead.',
    example: {
      id: 'b_steps_1',
      type: 'tls.g.steps',
      props: {
        steps: [
          { title: 'Setup', description: 'Initialize the environment' },
          { title: 'Configure', description: 'Set up your preferences' },
          { title: 'Run', description: 'Execute the main process' },
          { title: 'Review', description: 'Verify the results' },
        ],
        direction: 'horizontal',
        connector: 'line',
      },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 200], min: [400, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}