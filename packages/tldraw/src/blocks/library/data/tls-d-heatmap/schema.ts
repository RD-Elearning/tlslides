/**
 * Schema and defaults for tls.d.heatmap — a grid of cells shaded by value.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot, formatSlot } from '../_chart/schema-kit'

export const HEATMAP_MAX = 12

export const schema: BlockSchema = {
  rows: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 24 }, min: 2, max: HEATMAP_MAX },
    role: 'content',
    label: 'Row labels',
    required: true,
  },
  cols: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 16 }, min: 2, max: HEATMAP_MAX },
    role: 'content',
    label: 'Column labels',
    required: true,
    guidance: 'Short: they sit above narrow cells.',
  },
  values: {
    type: { kind: 'list', of: { kind: 'list', of: { kind: 'number' } } },
    role: 'content',
    label: 'Values',
    required: true,
    guidance: 'values[row][col]; missing or non-numeric = empty cell.',
  },
  ramp: enumSlot(['accent', 'diverging'], 'Colour ramp', 'diverging: negative / zero / positive'),
  showValues: boolSlot('Show values'),
  format: formatSlot(),
}

export interface HeatmapProps extends Record<string, unknown> {
  rows: string[]
  cols: string[]
  values: number[][]
  ramp?: 'accent' | 'diverging'
  showValues?: boolean
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: HeatmapProps = {
  rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  cols: ['9am', '11am', '1pm', '3pm', '5pm'],
  values: [
    [12, 30, 22, 18, 6],
    [15, 42, 35, 24, 9],
    [18, 55, 48, 31, 12],
    [14, 38, 41, 27, 10],
    [9, 21, 19, 12, 4],
  ],
  ramp: 'accent',
  showValues: true,
}
