/**
 * Schema and defaults for tls.g.timeline — dated events on one axis.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const TIMELINE_MAX = 8

export const schema: BlockSchema = {
  events: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          date: { type: { kind: 'text', maxChars: 20 }, required: true, role: 'content', label: 'Date', guidance: 'Year, month or quarter: "2024", "Mar 2025", "Q3".' },
          title: { type: { kind: 'text', maxChars: 40 }, required: true, role: 'content', label: 'Title', guidance: 'What happened, 2-5 words.' },
          text: { type: { kind: 'text', maxChars: 110 }, role: 'content', label: 'Note', guidance: 'One sentence; optional.' },
          icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon', help: 'Used when nodeStyle is icon.' },
        },
      },
      min: 3,
      max: TIMELINE_MAX,
    },
    role: 'content',
    label: 'Events',
    required: true,
    guidance: 'Events in date order, earliest first.',
  },
  axis: enumSlot(['horizontal', 'vertical'], 'Axis'),
  alternate: { type: { kind: 'boolean' }, role: 'option', label: 'Alternate sides', help: 'Cards alternate above/below (or left/right) so more events fit.' },
  nowIndex: {
    type: { kind: 'number', min: -1, max: 20 },
    role: 'option',
    label: 'Now marker',
    help: '0-based index of the latest event reached; later events are muted. -1 for none.',
  },
  nodeStyle: enumSlot(['dot', 'icon', 'number'], 'Node style'),
  showText: { type: { kind: 'boolean' }, role: 'option', label: 'Show notes', toggles: 'text' },
}

export interface TimelineEvent {
  date: string
  title: string
  text?: string
  icon?: string
}

export interface TimelineProps extends Record<string, unknown> {
  events: TimelineEvent[]
  axis?: 'horizontal' | 'vertical'
  alternate?: boolean
  nowIndex?: number
  nodeStyle?: 'dot' | 'icon' | 'number'
  showText?: boolean
}

export const defaults: TimelineProps = {
  events: [
    { date: '2021', title: 'Founded', text: 'Two founders and a prototype' },
    { date: '2022', title: 'First customers', text: 'Ten pilots go live' },
    { date: '2023', title: 'Series A', text: 'Team grows to thirty' },
    { date: '2024', title: 'Global launch', text: 'Available in twelve countries' },
  ],
  axis: 'horizontal',
  alternate: true,
  nowIndex: -1,
  nodeStyle: 'dot',
  showText: true,
}
