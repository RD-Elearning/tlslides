/**
 * Schema and defaults for tls.d.funnel-chart — stages sized by value, with drop-off between them.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot, formatSlot } from '../_chart/schema-kit'

export const FUNNEL_MAX_STAGES = 7

export const schema: BlockSchema = {
  stages: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Stage' },
          value: { type: { kind: 'number' }, required: true, role: 'content', label: 'Value' },
        },
      },
      min: 3,
      max: FUNNEL_MAX_STAGES,
    },
    role: 'content',
    label: 'Stages',
    required: true,
    guidance: 'Ordered from widest to narrowest, real counts.',
  },
  shape: enumSlot(['funnel', 'bars'], 'Shape', 'bars = left-aligned bars.'),
  showDropoff: enumSlot(['percent', 'none'], 'Drop-off'),
  format: formatSlot(),
}

export interface FunnelStage {
  label: string
  value: number
}

export interface FunnelChartProps extends Record<string, unknown> {
  stages: FunnelStage[]
  shape?: 'funnel' | 'bars'
  showDropoff?: 'percent' | 'none'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: FunnelChartProps = {
  stages: [
    { label: 'Visitors', value: 12000 },
    { label: 'Sign-ups', value: 4200 },
    { label: 'Trials', value: 1800 },
    { label: 'Customers', value: 540 },
  ],
  shape: 'funnel',
  showDropoff: 'percent',
  format: 'compact',
}
