/**
 * Schema and defaults for tls.g.roadmap — Gantt-style lanes of bars over periods.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const ROADMAP_MAX_PERIODS = 12
export const ROADMAP_MAX_LANES = 6
export const ROADMAP_MAX_ITEMS = 5
export const STATUSES = ['done', 'active', 'planned', 'risk'] as const

export const schema: BlockSchema = {
  periods: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 12 }, min: 2, max: ROADMAP_MAX_PERIODS },
    role: 'content',
    label: 'Periods',
    required: true,
    guidance: 'Column headers in time order: Q1..Q4, months.',
  },
  lanes: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          name: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Lane', guidance: 'Team or workstream, 1-3 words.' },
          items: {
            type: {
              kind: 'list',
              of: {
                kind: 'object',
                fields: {
                  label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Label' },
                  start: { type: { kind: 'number', min: 0 }, required: true, role: 'content', label: 'Start', help: 'Period index, 0-based; fractions allowed.' },
                  end: { type: { kind: 'number', min: 0 }, required: true, role: 'content', label: 'End', help: 'Last period index, inclusive; fractions allowed.' },
                  status: { type: { kind: 'enum', values: ['done', 'active', 'planned', 'risk'] }, role: 'content', label: 'Status' },
                },
              },
              min: 1,
              max: ROADMAP_MAX_ITEMS,
            },
            required: true,
            role: 'content',
            label: 'Items',
          },
        },
      },
      min: 1,
      max: ROADMAP_MAX_LANES,
    },
    role: 'content',
    label: 'Lanes',
    required: true,
    guidance: 'Per lane: name, items[{label,start,end,status done|active|planned|risk}]; start/end = 0-based period index, end inclusive.',
  },
  todayAt: {
    type: { kind: 'number', min: -1, max: 12 },
    role: 'option',
    label: 'Today marker',
    help: 'Period index, fractions ok (1.5 = mid second period); -1 none.',
  },
  statusColors: { type: { kind: 'boolean' }, role: 'option', label: 'Status colours', help: 'Off = one colour per lane.' },
  laneLabels: enumSlot(['left', 'none'], 'Lane labels'),
}

export interface RoadmapItem {
  label: string
  start: number
  end: number
  status?: (typeof STATUSES)[number]
}

export interface RoadmapLane {
  name: string
  items: RoadmapItem[]
}

export interface RoadmapProps extends Record<string, unknown> {
  periods: string[]
  lanes: RoadmapLane[]
  todayAt?: number
  statusColors?: boolean
  laneLabels?: 'left' | 'none'
}

export const defaults: RoadmapProps = {
  periods: ['Q1', 'Q2', 'Q3', 'Q4'],
  lanes: [
    { name: 'Product', items: [{ label: 'Redesign', start: 0, end: 1, status: 'done' }, { label: 'Mobile app', start: 1.5, end: 3, status: 'active' }] },
    { name: 'Platform', items: [{ label: 'Migration', start: 0.5, end: 2, status: 'active' }, { label: 'Scale-out', start: 3, end: 3, status: 'planned' }] },
    { name: 'Growth', items: [{ label: 'Launch', start: 2, end: 2.5, status: 'risk' }] },
  ],
  todayAt: 1.5,
  statusColors: true,
  laneLabels: 'left',
}
