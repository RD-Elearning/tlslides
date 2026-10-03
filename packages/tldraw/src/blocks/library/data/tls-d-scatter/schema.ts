/**
 * Schema and defaults for tls.d.scatter — points on two numeric axes.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot, formatSlot, gridlinesSlot, highlightSlot, legendSlot } from '../_chart/schema-kit'

export const SCATTER_MAX_POINTS = 60

export const schema: BlockSchema = {
  points: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          x: { type: { kind: 'number' }, required: true, role: 'content', label: 'X' },
          y: { type: { kind: 'number' }, required: true, role: 'content', label: 'Y' },
          label: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Label' },
          group: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Group', help: 'Same group = same colour (up to 6).' },
        },
      },
      min: 3,
      max: SCATTER_MAX_POINTS,
    },
    role: 'content',
    label: 'Points',
    required: true,
  },
  quadrants: boolSlot('Quadrant lines', 'Cross lines at the middle of each axis.'),
  trendline: boolSlot('Trend line', 'Least-squares fit.'),
  labelPoints: enumSlot(['none', 'highlighted', 'all'], 'Point labels'),
  highlightIndex: highlightSlot('Point'),
  gridlines: gridlinesSlot(),
  format: formatSlot(),
  legend: legendSlot(),
}

export interface ScatterPoint {
  x: number
  y: number
  label?: string
  group?: string
}

export interface ScatterProps extends Record<string, unknown> {
  points: ScatterPoint[]
  quadrants?: boolean
  trendline?: boolean
  labelPoints?: 'none' | 'highlighted' | 'all'
  highlightIndex?: number
  gridlines?: 'major' | 'none'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
  legend?: 'top' | 'bottom' | 'right' | 'none'
}

export const defaults: ScatterProps = {
  points: [
    { x: 12, y: 30, label: 'Alpha', group: 'Core' },
    { x: 25, y: 44, label: 'Beta', group: 'Core' },
    { x: 33, y: 41, label: 'Gamma', group: 'Core' },
    { x: 48, y: 62, label: 'Delta', group: 'Growth' },
    { x: 57, y: 70, label: 'Epsilon', group: 'Growth' },
    { x: 66, y: 58, label: 'Zeta', group: 'Growth' },
    { x: 78, y: 85, label: 'Eta', group: 'Growth' },
  ],
  quadrants: false,
  trendline: true,
  labelPoints: 'none',
  gridlines: 'major',
}
