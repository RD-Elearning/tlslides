/**
 * Schema and defaults for tls.t.numbered — numbered points.
 */

import type { BlockSchema } from '../../../types'

export const NUMBERED_MAX_ITEMS = 8

export const schema: BlockSchema = {
  items: {
    type: { kind: 'list', of: { kind: 'richText', maxChars: 180 }, min: 2, max: NUMBERED_MAX_ITEMS },
    role: 'content',
    label: 'Points',
    required: true,
    guidance: 'Short sentences. Wrap a key phrase in **double asterisks** to bold it.',
  },
  markerStyle: {
    type: { kind: 'enum', values: ['decimal', 'padded', 'roman', 'alpha', 'badge'] },
    role: 'option',
    label: 'Marker style',
    help: 'badge puts the number in a filled circle.',
  },
  start: {
    type: { kind: 'number', min: 1 },
    role: 'option',
    label: 'Start at',
  },
  spacing: {
    type: { kind: 'enum', values: ['default', 'compact', 'roomy'] },
    role: 'option',
    label: 'Spacing',
  },
  columns: {
    type: { kind: 'enum', values: ['1', '2'] },
    role: 'option',
    label: 'Columns',
    help: 'Two balanced columns.',
  },
  markerTone: {
    type: { kind: 'enum', values: ['accent', 'text', 'muted'] },
    role: 'option',
    label: 'Marker colour',
  },
}

export interface NumberedProps extends Record<string, unknown> {
  items: string[]
  markerStyle?: 'decimal' | 'padded' | 'roman' | 'alpha' | 'badge'
  start?: number
  spacing?: 'default' | 'compact' | 'roomy'
  columns?: '1' | '2'
  markerTone?: 'accent' | 'text' | 'muted'
}

export const defaults: NumberedProps = {
  items: [
    'Start from the audience problem, not the product',
    'Show **one** idea per slide',
    'Back every claim with a number',
    'End with the single action you want taken',
  ],
  markerStyle: 'decimal',
  start: 1,
  spacing: 'default',
  columns: '1',
  markerTone: 'accent',
}
