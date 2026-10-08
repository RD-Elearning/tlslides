/**
 * Schema and defaults for tls.d.gauge — half-circle dial with threshold bands.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot, formatSlot, numberSlot } from '../_chart/schema-kit'

export const GAUGE_MAX_BANDS = 5
export const GAUGE_TONES = ['negative', 'warning', 'positive', 'neutral'] as const

export const schema: BlockSchema = {
  value: { type: { kind: 'number' }, role: 'content', label: 'Value', required: true },
  min: numberSlot('Minimum', 'Scale start. Default 0.', 'content'),
  max: numberSlot('Maximum', 'Scale end. Default 100.', 'content'),
  label: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Label', help: 'What is measured.' },
  bands: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          to: { type: { kind: 'number' }, required: true, role: 'content', label: 'Up to' },
          tone: { type: { kind: 'enum', values: [...GAUGE_TONES] }, required: true, role: 'content', label: 'Tone' },
        },
      },
      min: 0,
      max: GAUGE_MAX_BANDS,
    },
    role: 'content',
    label: 'Bands',
    help: 'Ascending thresholds, each with a tone.',
  },
  needle: enumSlot(['needle', 'marker'], 'Pointer'),
  showTicks: boolSlot('Show ticks', undefined, 'tick'),
  format: formatSlot(),
}

export interface GaugeBand {
  to: number
  tone: 'negative' | 'warning' | 'positive' | 'neutral'
}

export interface GaugeProps extends Record<string, unknown> {
  value: number
  min?: number
  max?: number
  label?: string
  bands?: GaugeBand[]
  needle?: 'needle' | 'marker'
  showTicks?: boolean
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: GaugeProps = {
  value: 72,
  min: 0,
  max: 100,
  label: 'Customer health',
  bands: [
    { to: 40, tone: 'negative' },
    { to: 70, tone: 'warning' },
    { to: 100, tone: 'positive' },
  ],
  needle: 'needle',
  showTicks: true,
}
