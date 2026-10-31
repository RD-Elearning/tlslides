/**
 * Schema and defaults for tls.g.orbit — one concept in the centre, satellites around it (vivid V4).
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const ORBIT_MIN = 3
export const ORBIT_MAX = 8

export const schema: BlockSchema = {
  center: { type: { kind: 'text', maxChars: 30 }, role: 'content', label: 'Centre', required: true, guidance: 'The concept everything relates to, 1-3 words.' },
  centerIcon: { type: { kind: 'icon' }, role: 'content', label: 'Centre icon' },
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 28 }, required: true, role: 'content', label: 'Satellite', guidance: '1-3 words.' },
          text: { type: { kind: 'text', maxChars: 70 }, role: 'content', label: 'Note', guidance: 'One short line.' },
          icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
        },
      },
      min: ORBIT_MIN,
      max: ORBIT_MAX,
    },
    role: 'content',
    label: 'Satellites',
    required: true,
    guidance: '3-8 parts or factors around the centre, clockwise from the top.',
  },
  spokes: enumSlot(['line', 'none'], 'Spokes', 'line = a line from the centre to each satellite.'),
}

export interface OrbitItem {
  label: string
  text?: string
  icon?: string
}

export interface OrbitProps extends Record<string, unknown> {
  center: string
  centerIcon?: string
  items: OrbitItem[]
  spokes?: 'line' | 'none'
}

export const defaults: OrbitProps = {
  center: 'Learner',
  centerIcon: 'user',
  items: [
    { label: 'Teacher', text: 'Guides and gives feedback', icon: 'school' },
    { label: 'Peers', text: 'Discuss and help each other', icon: 'users' },
    { label: 'Materials', text: 'Books, videos, exercises', icon: 'book' },
    { label: 'Practice', text: 'Regular short exercises', icon: 'pencil' },
    { label: 'Assessment', text: 'Quizzes that show progress', icon: 'checklist' },
  ],
  spokes: 'line',
}
