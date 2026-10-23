/**
 * Schema and defaults for tls.g.target — concentric rings from the core outward (vivid V4).
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const TARGET_MIN = 2
export const TARGET_MAX = 5

export const schema: BlockSchema = {
  rings: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Ring', guidance: '1-3 words.' },
          text: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Note', guidance: 'One line on what this ring holds.' },
        },
      },
      min: TARGET_MIN,
      max: TARGET_MAX,
    },
    role: 'content',
    label: 'Rings',
    required: true,
    guidance: 'The core first, then outward (2-5): the centre is what matters most.',
  },
  fill: enumSlot(['gradient', 'single', 'series'], 'Fill'),
  labels: enumSlot(['side', 'none'], 'Labels', 'side = labels in a column with leader lines; none = the ring names only, on the rings.'),
}

export interface TargetRing {
  label: string
  text?: string
}

export interface TargetProps extends Record<string, unknown> {
  rings: TargetRing[]
  fill?: 'gradient' | 'single' | 'series'
  labels?: 'side' | 'none'
}

export const defaults: TargetProps = {
  rings: [
    { label: 'Core concept', text: 'What every learner must master' },
    { label: 'Key skills', text: 'Applied in most exercises' },
    { label: 'Context', text: 'Background that helps understanding' },
  ],
  fill: 'gradient',
  labels: 'side',
}
