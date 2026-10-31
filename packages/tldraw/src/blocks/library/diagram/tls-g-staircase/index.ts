/**
 * tls.g.staircase — levels that rise step by step, each with an icon, label and note (vivid V4).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGStaircase: BlockDefinition = {
  type: 'tls.g.staircase',
  name: 'Staircase',
  family: 'diagram',
  tier: 'A',
  summary: 'Levels rising left to right like stairs, lowest first, each with an icon, a label and a note; a stair line along the tops.',
  keywords: ['staircase', 'stairs', 'levels', 'ladder', 'progression', 'bloom', 'maturity', 'growth', 'climb'],
  category: 'process',
  scope: 'group',
  shortDescription: 'Rising steps: levels that build up, lowest first',
  related: ['tls.g.pyramid', 'tls.g.chevrons', 'tls.c.steps'],
  describe: {
    when: 'Levels that build on each other and go up: Bloom\'s taxonomy, skill or maturity levels, stages of growth, from beginner to expert.',
    avoid: 'Steps of a procedure done in order (use tls.c.steps); tiers by size or importance (use tls.g.pyramid); a timeline (use tls.g.timeline).',
    example: {
      id: 'b_staircase',
      type: 'tls.g.staircase',
      props: {
        steps: [
          { label: 'Beginner', text: 'Follows worked examples', icon: 'seedling' },
          { label: 'Practitioner', text: 'Solves familiar problems alone', icon: 'puzzle' },
          { label: 'Expert', text: 'Designs new solutions', icon: 'trophy' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 560], min: [600, 340] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
