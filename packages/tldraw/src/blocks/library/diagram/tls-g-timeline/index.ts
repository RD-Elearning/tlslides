/**
 * tls.g.timeline — dated events on one axis with a card per event (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGTimeline: BlockDefinition = {
  type: 'tls.g.timeline',
  name: 'Timeline',
  family: 'diagram',
  tier: 'A',
  summary: 'Dated events along a horizontal or vertical axis, with a card per event and an optional now marker.',
  keywords: ['timeline', 'history', 'dates', 'schedule', 'milestones', 'chronology'],
  category: 'timeline',
  scope: 'group',
  shortDescription: 'Dated events on one axis with a title and note per event; optional today marker',
  related: ['tls.g.roadmap', 'tls.g.milestones', 'tls.g.steps'],
  describe: {
    when: 'Dated order: history, project timeline, course schedule.',
    avoid: 'Undated steps (use tls.g.steps). Overlapping periods go in tls.g.roadmap.',
    example: {
      id: 'b_timeline',
      type: 'tls.g.timeline',
      props: {
        events: [
          { date: '2021', title: 'Founded', text: 'Two founders and a prototype' },
          { date: '2022', title: 'First customers', text: 'Ten pilots go live' },
          { date: '2023', title: 'Series A', text: 'Team grows to thirty' },
          { date: '2024', title: 'Global launch', text: 'Available in twelve countries' },
        ],
        nowIndex: 2,
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1400, 520], min: [640, 360] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
