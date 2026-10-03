/**
 * Schema and defaults for tls.g.venn — two or three overlapping circles.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const VENN_MAX = 3

export const schema: BlockSchema = {
  sets: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Set' },
          text: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Note' },
        },
      },
      min: 2,
      max: VENN_MAX,
    },
    role: 'content',
    label: 'Sets',
    required: true,
    guidance: '2 or 3 sets. Short labels.',
  },
  overlap: { type: { kind: 'text', maxChars: 30 }, role: 'content', label: 'Overlap', guidance: 'What all sets share. 1-3 words.' },
  pairOverlaps: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 24 }, max: 3 },
    role: 'content',
    label: 'Pair overlaps',
    guidance: '3 sets only: shared by A+B, B+C, A+C, in that order.',
  },
  opacity: enumSlot(['soft', 'medium'], 'Opacity'),
  labels: enumSlot(['inside', 'outside'], 'Labels', 'outside = set names beside the circles.'),
}

export interface VennProps extends Record<string, unknown> {
  sets: Array<{ label: string; text?: string }>
  overlap?: string
  pairOverlaps?: string[]
  opacity?: 'soft' | 'medium'
  labels?: 'inside' | 'outside'
}

export const defaults: VennProps = {
  sets: [
    { label: 'Skills', text: 'What we are good at' },
    { label: 'Passion', text: 'What we love' },
    { label: 'Market', text: 'What people pay for' },
  ],
  overlap: 'Sweet spot',
  pairOverlaps: ['Craft', 'Demand', 'Career'],
  opacity: 'soft',
  labels: 'inside',
}
