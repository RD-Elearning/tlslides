/**
 * Schema and defaults for tls.g.staircase — levels that rise step by step (vivid V4).
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const STAIR_MIN = 3
export const STAIR_MAX = 6

export const schema: BlockSchema = {
  steps: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 28 }, required: true, role: 'content', label: 'Level', guidance: '1-3 words: Remember, Understand, Apply.' },
          text: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Note', guidance: 'One short line on what the level means.' },
          icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon' },
        },
      },
      min: STAIR_MIN,
      max: STAIR_MAX,
    },
    role: 'content',
    label: 'Steps',
    required: true,
    guidance: 'The lowest level first, the highest last (3-6).',
  },
  numbering: enumSlot(['number', 'none'], 'Numbering', 'number = 1, 2, 3 on the steps.'),
  fill: enumSlot(['gradient', 'single', 'series'], 'Fill'),
}

export interface StairStep {
  label: string
  text?: string
  icon?: string
}

export interface StaircaseProps extends Record<string, unknown> {
  steps: StairStep[]
  numbering?: 'number' | 'none'
  fill?: 'gradient' | 'single' | 'series'
}

export const defaults: StaircaseProps = {
  steps: [
    { label: 'Remember', text: 'Recall facts and basic terms', icon: 'brain' },
    { label: 'Understand', text: 'Explain ideas in your own words', icon: 'bulb' },
    { label: 'Apply', text: 'Use what you know in a new case', icon: 'puzzle' },
    { label: 'Create', text: 'Build something original', icon: 'rocket' },
  ],
  numbering: 'number',
  fill: 'gradient',
}
