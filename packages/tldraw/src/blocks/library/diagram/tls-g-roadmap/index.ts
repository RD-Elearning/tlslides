/**
 * tls.g.roadmap — Gantt-style lanes of bars over time periods (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGRoadmap: BlockDefinition = {
  type: 'tls.g.roadmap',
  name: 'Roadmap',
  family: 'diagram',
  tier: 'A',
  summary: 'Lanes of bars across periods, coloured by status, with a today line.',
  keywords: ['roadmap', 'gantt', 'plan', 'schedule', 'lanes', 'quarters'],
  category: 'timeline',
  scope: 'group',
  shortDescription: 'Gantt-style lanes of bars over time periods, with status colours',
  related: ['tls.g.timeline', 'tls.g.steps'],
  describe: {
    when: 'Dated order with overlap: product roadmap, project plan, semester plan.',
    avoid: 'Single-point events (use tls.g.timeline or tls.g.milestones).',
    example: {
      id: 'b_roadmap',
      type: 'tls.g.roadmap',
      props: {
        periods: ['Q1', 'Q2', 'Q3', 'Q4'],
        lanes: [
          { name: 'Product', items: [{ label: 'Redesign', start: 0, end: 1, status: 'done' }, { label: 'Mobile app', start: 1.5, end: 3, status: 'active' }] },
          { name: 'Platform', items: [{ label: 'Migration', start: 0.5, end: 2, status: 'active' }] },
        ],
        todayAt: 1.5,
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1400, 520], min: [700, 300] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
