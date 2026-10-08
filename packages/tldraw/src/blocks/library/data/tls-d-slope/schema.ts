/**
 * Schema and defaults for tls.d.slope — items connected between two time points.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot, formatSlot } from '../_chart/schema-kit'

export const SLOPE_MAX_ITEMS = 10

export const schema: BlockSchema = {
  startLabel: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'Start label', required: true, help: 'Left column, e.g. 2023.' },
  endLabel: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'End label', required: true, help: 'Right column, e.g. 2025.' },
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          name: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Name' },
          start: { type: { kind: 'number' }, required: true, role: 'content', label: 'Start' },
          end: { type: { kind: 'number' }, required: true, role: 'content', label: 'End' },
        },
      },
      min: 2,
      max: SLOPE_MAX_ITEMS,
    },
    role: 'content',
    label: 'Items',
    required: true,
  },
  highlight: enumSlot(['none', 'risers', 'fallers'], 'Highlight', 'Others are dimmed.'),
  format: formatSlot(),
}

export interface SlopeItem {
  name: string
  start: number
  end: number
}

export interface SlopeProps extends Record<string, unknown> {
  startLabel: string
  endLabel: string
  items: SlopeItem[]
  highlight?: 'none' | 'risers' | 'fallers'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: SlopeProps = {
  startLabel: '2023',
  endLabel: '2025',
  items: [
    { name: 'Alpha', start: 42, end: 61 },
    { name: 'Beta', start: 55, end: 49 },
    { name: 'Gamma', start: 30, end: 44 },
    { name: 'Delta', start: 68, end: 52 },
  ] as SlopeItem[],
  highlight: 'none',
}
