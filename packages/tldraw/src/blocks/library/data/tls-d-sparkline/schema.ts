/**
 * Schema and defaults for tls.d.sparkline — a tiny axis-free trend line.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot, formatSlot } from '../_chart/schema-kit'

export const SPARK_MAX_VALUES = 60

export const schema: BlockSchema = {
  values: {
    type: { kind: 'list', of: { kind: 'number' }, min: 3, max: SPARK_MAX_VALUES },
    role: 'content',
    label: 'Values',
    required: true,
    help: 'Ordered values, oldest first.',
  },
  label: { type: { kind: 'text', maxChars: 30 }, role: 'content', label: 'Label' },
  fill: boolSlot('Fill', 'Tint the area under the line.'),
  endDot: boolSlot('End dot'),
  showLast: enumSlot(['none', 'value', 'delta'], 'Last figure', 'delta = last minus first.'),
  format: formatSlot(),
}

export interface SparklineProps extends Record<string, unknown> {
  values: number[]
  label?: string
  fill?: boolean
  endDot?: boolean
  showLast?: 'none' | 'value' | 'delta'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: SparklineProps = {
  values: [12, 14, 13, 18, 17, 22, 21, 27, 31, 30, 36],
  label: 'Weekly signups',
  fill: true,
  endDot: true,
  showLast: 'value',
}
