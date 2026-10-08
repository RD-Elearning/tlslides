/**
 * Schema and defaults for tls.d.bubble — a scatter plot whose circle area shows a third value.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, formatSlot, gridlinesSlot } from '../_chart/schema-kit'

export const BUBBLE_MAX_POINTS = 30

export const schema: BlockSchema = {
  points: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          x: { type: { kind: 'number' }, required: true, role: 'content', label: 'X' },
          y: { type: { kind: 'number' }, required: true, role: 'content', label: 'Y' },
          r: { type: { kind: 'number' }, required: true, role: 'content', label: 'Size', help: 'Non-negative; sets circle area.' },
          label: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Label' },
        },
      },
      min: 3,
      max: BUBBLE_MAX_POINTS,
    },
    role: 'content',
    label: 'Bubbles',
    required: true,
  },
  sizeLegend: boolSlot('Size legend', 'Reference circles at the right.'),
  gridlines: gridlinesSlot(),
  format: formatSlot(),
}

export interface BubblePoint {
  x: number
  y: number
  r: number
  label?: string
}

export interface BubbleProps extends Record<string, unknown> {
  points: BubblePoint[]
  sizeLegend?: boolean
  gridlines?: 'major' | 'none'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: BubbleProps = {
  points: [
    { x: 12, y: 8, r: 40, label: 'Alpha' },
    { x: 28, y: 22, r: 120, label: 'Beta' },
    { x: 45, y: 15, r: 75, label: 'Gamma' },
    { x: 60, y: 38, r: 200, label: 'Delta' },
    { x: 78, y: 30, r: 60, label: 'Epsilon' },
  ],
  sizeLegend: true,
  gridlines: 'major',
}
