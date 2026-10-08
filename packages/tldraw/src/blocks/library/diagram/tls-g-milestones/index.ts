/**
 * tls.g.milestones — diamond checkpoints along a line, done ones filled (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGMilestones: BlockDefinition = {
  type: 'tls.g.milestones',
  name: 'Milestones',
  family: 'diagram',
  tier: 'A',
  summary: 'Key checkpoints as diamonds on a line, filled when done, each with a date and short label.',
  keywords: ['milestones', 'checkpoints', 'dates', 'progress', 'deadlines'],
  category: 'timeline',
  scope: 'group',
  shortDescription: 'Diamond milestone markers along a line, done ones filled',
  related: ['tls.g.timeline', 'tls.g.roadmap'],
  describe: {
    when: 'Dated order of key checkpoints only (no descriptions).',
    avoid: 'Events that need descriptions (use tls.g.timeline).',
    example: {
      id: 'b_milestones',
      type: 'tls.g.milestones',
      props: {
        items: [
          { date: 'Jan', label: 'Kick-off', done: true },
          { date: 'Mar', label: 'Prototype', done: true },
          { date: 'Jun', label: 'Beta release' },
          { date: 'Sep', label: 'Launch' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 320], min: [600, 220] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
