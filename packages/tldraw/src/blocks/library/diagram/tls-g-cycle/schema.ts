/**
 * Schema and defaults for tls.g.cycle — steps on a ring with arrows looping back to the start.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const CYCLE_MAX = 6

export const schema: BlockSchema = {
  steps: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Label', guidance: '1-3 words.' },
          text: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Note', guidance: 'One short line; optional.' },
          icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
        },
      },
      min: 3,
      max: CYCLE_MAX,
    },
    role: 'content',
    label: 'Steps',
    required: true,
    guidance: 'Steps in loop order, the first sits at the top.',
  },
  center: { type: { kind: 'text', maxChars: 30 }, role: 'content', label: 'Centre text', guidance: 'Name of the loop.' },
  direction: enumSlot(['clockwise', 'counter'], 'Direction'),
  nodeStyle: enumSlot(['circle', 'card'], 'Node style', 'circle = numbered or icon node with the label outside.'),
  arrowStyle: enumSlot(['arc', 'none'], 'Arrows'),
  showCenter: { type: { kind: 'boolean' }, role: 'option', label: 'Show centre text', toggles: 'center' },
  showText: { type: { kind: 'boolean' }, role: 'option', label: 'Show notes', toggles: 'text' },
}

export interface CycleStep {
  label: string
  text?: string
  icon?: string
}

export interface CycleProps extends Record<string, unknown> {
  steps: CycleStep[]
  center?: string
  direction?: 'clockwise' | 'counter'
  nodeStyle?: 'circle' | 'card'
  arrowStyle?: 'arc' | 'none'
  showCenter?: boolean
  showText?: boolean
}

export const defaults: CycleProps = {
  steps: [
    { label: 'Plan', text: 'Set the goal' },
    { label: 'Do', text: 'Try the change' },
    { label: 'Check', text: 'Measure the result' },
    { label: 'Act', text: 'Keep what works' },
  ],
  center: 'Improve',
  direction: 'clockwise',
  nodeStyle: 'circle',
  arrowStyle: 'arc',
  showCenter: true,
  showText: true,
}
