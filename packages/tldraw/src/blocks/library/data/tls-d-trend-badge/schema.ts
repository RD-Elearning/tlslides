/**
 * Schema and defaults for tls.d.trend-badge — a pill with a direction arrow and a change value.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot, formatSlot } from '../_chart/schema-kit'

export const schema: BlockSchema = {
  delta: { type: { kind: 'number' }, role: 'content', label: 'Change', required: true, guidance: 'Signed change; the sign sets the arrow.' },
  label: { type: { kind: 'text', maxChars: 30 }, role: 'content', label: 'Label', help: 'Short context after the value.' },
  format: formatSlot(),
  polarity: enumSlot(['upGood', 'downGood', 'neutral'], 'Polarity', 'Which direction is good.'),
  size: enumSlot(['md', 'sm', 'lg'], 'Size'),
}

export interface TrendBadgeProps extends Record<string, unknown> {
  delta: number
  label?: string
  format?: 'plain' | 'compact' | 'percent' | 'currency'
  polarity?: 'upGood' | 'downGood' | 'neutral'
  size?: 'md' | 'sm' | 'lg'
}

export const defaults: TrendBadgeProps = {
  delta: 12.5,
  label: 'vs last quarter',
  format: 'percent',
  polarity: 'upGood',
  size: 'md',
}
