/**
 * Schema and defaults for tls.d.radar — a spider chart over radial axes.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, legendSlot, numberSlot, seriesSlot } from '../_chart/schema-kit'

export const RADAR_MAX_AXES = 8
export const RADAR_MAX_SERIES = 3

export const schema: BlockSchema = {
  axes: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 24 }, min: 3, max: RADAR_MAX_AXES },
    role: 'content',
    label: 'Axes',
    required: true,
    help: 'Criteria around the dial, in order.',
  },
  series: seriesSlot(1, RADAR_MAX_SERIES, 'One shape each; one value per axis.'),
  max: numberSlot('Scale maximum', 'Default: the largest value, rounded up.'),
  fill: boolSlot('Fill shapes'),
  rings: numberSlot('Rings', 'Grid rings, 1-8. Default 4.'),
  legend: legendSlot(),
}

export interface RadarProps extends Record<string, unknown> {
  axes: string[]
  series: Array<{ name: string; values: Array<number | null> }>
  max?: number
  fill?: boolean
  rings?: number
  legend?: 'top' | 'bottom' | 'right' | 'none'
}

export const defaults: RadarProps = {
  axes: ['Speed', 'Quality', 'Cost', 'Support', 'Security', 'Usability'],
  series: [
    { name: 'Ours', values: [8, 9, 6, 7, 9, 8] },
    { name: 'Rival', values: [6, 7, 8, 5, 6, 7] },
  ],
  fill: true,
  rings: 4,
}
