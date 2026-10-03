/**
 * Schema and defaults for tls.g.milestones — diamond checkpoints along a line.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const MILESTONES_MAX = 8

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          date: { type: { kind: 'text', maxChars: 20 }, required: true, role: 'content', label: 'Date' },
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Milestone' },
          done: { type: { kind: 'boolean' }, role: 'content', label: 'Done' },
        },
      },
      min: 2,
      max: MILESTONES_MAX,
    },
    role: 'content',
    label: 'Milestones',
    required: true,
    guidance: 'Checkpoints in date order; no descriptions.',
  },
  axis: enumSlot(['horizontal', 'vertical'], 'Axis'),
  labels: enumSlot(['alternate', 'below'], 'Labels', 'alternate = date and label swap sides; below = date above, label below.'),
}

export interface Milestone {
  date: string
  label: string
  done?: boolean
}

export interface MilestonesProps extends Record<string, unknown> {
  items: Milestone[]
  axis?: 'horizontal' | 'vertical'
  labels?: 'alternate' | 'below'
}

export const defaults: MilestonesProps = {
  items: [
    { date: 'Jan', label: 'Kick-off', done: true },
    { date: 'Mar', label: 'Prototype', done: true },
    { date: 'Jun', label: 'Beta release', done: false },
    { date: 'Sep', label: 'Launch', done: false },
  ],
  axis: 'horizontal',
  labels: 'alternate',
}
