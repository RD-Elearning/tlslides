/**
 * Schema and defaults for tls.d.donut — shares of a whole as a ring, with an optional centre value.
 *
 * `slices` keeps its original shape (`value`, `color`, optional `label`); RV05 added the label,
 * the centre value and the label mode. A slice colour is one of the listed roles; anything else
 * (the old example used `accent1`..`accent4`, which are not roles and drew black) falls back to
 * the categorical ramp.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot } from '../_chart/schema-kit'

export const DONUT_MAX_SLICES = 6
export const DONUT_COLORS = ['accent', 'accent2', 'positive', 'warning', 'negative', 'neutral'] as const

export const schema: BlockSchema = {
  slices: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Label', required: true },
          value: { type: { kind: 'number', min: 0 }, role: 'content', label: 'Value', required: true },
          color: { type: { kind: 'enum', values: [...DONUT_COLORS] }, role: 'option', label: 'Colour' },
        },
      },
      min: 0,
      max: DONUT_MAX_SLICES,
    },
    role: 'content',
    label: 'Slices',
    required: true,
    help: 'label!, value!, colour (optional).',
  },
  total: {
    type: { kind: 'number' },
    role: 'option',
    label: 'Total',
    help: 'Above the sum, the rest of the ring stays empty.',
  },
  centerValue: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Centre value', help: 'Big text in the hole.' },
  centerLabel: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Centre label', help: 'Caption under it.' },
  labels: enumSlot(['legend', 'outside'], 'Labels', 'legend (default) or outside.'),
  showPercent: boolSlot('Show percent'),
}

export interface DonutSlice {
  value: number
  label?: string
  color?: string
}

export interface DonutProps extends Record<string, unknown> {
  slices?: DonutSlice[]
  total?: number
  centerValue?: string
  centerLabel?: string
  labels?: 'legend' | 'outside'
  showPercent?: boolean
}

export const defaults: DonutProps = {
  slices: [
    { label: 'Subscriptions', value: 48 },
    { label: 'Services', value: 27 },
    { label: 'Licences', value: 17 },
    { label: 'Other', value: 8 },
  ],
  total: 100,
  centerValue: '',
  centerLabel: '',
  labels: 'legend',
  showPercent: true,
}
