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
  summary: 'Numbered step strip: accent badge, title and one-line description per step, joined by thin connectors.',
  keywords: ['steps', 'process', 'workflow', 'diagram', 'flow'],
  category: 'process',
  scope: 'group',
  shortDescription: 'Compact numbered step strip with thin connectors',
  related: ['tls.c.steps', 'tls.g.chevrons', 'tls.g.cycle', 'tls.g.flow'],
  describe: {
    when: 'A compact 2-8 step process inside a slide: numbered badge, title, short line per step.',
    avoid: 'A whole process slide (tls.c.steps); a current phase (tls.g.chevrons); a loop (tls.g.cycle); branching (tls.g.flow); dates (tls.g.timeline).',
    example: {
      id: 'b_steps_1',
      type: 'tls.g.steps',
      props: {
        steps: [
          { title: 'Brief', description: 'Agree the goal and the audience' },
          { title: 'Draft', description: 'Build the first version' },
          { title: 'Review', description: 'Collect feedback from the team' },
          { title: 'Publish', description: 'Share it and track results' },
        ],
        direction: 'horizontal',
        connector: 'arrow',
      },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 220], min: [480, 150] },
  layout: layout as BlockDefinition['layout'],
  motion,
}