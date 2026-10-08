/**
 * Schema and defaults for tls.d.waterfall — a running total built from increases and decreases.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot, formatSlot, gridlinesSlot } from '../_chart/schema-kit'

export const WATERFALL_MAX_STEPS = 12

export const schema: BlockSchema = {
  steps: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 24 }, required: true, role: 'content', label: 'Label' },
          value: { type: { kind: 'number' }, required: true, role: 'content', label: 'Value' },
          kind: { type: { kind: 'enum', values: ['delta', 'total'] }, role: 'content', label: 'Kind', help: 'total = bar from zero.' },
        },
      },
      min: 3,
      max: WATERFALL_MAX_STEPS,
    },
    role: 'content',
    label: 'Steps',
    required: true,
    guidance: 'Start total, signed changes, end total.',
  },
  connectors: boolSlot('Connectors'),
  colorBy: enumSlot(['sign', 'single'], 'Colour', 'sign = positive / negative roles.'),
  valueLabels: enumSlot(['end', 'none'], 'Value labels'),
  gridlines: gridlinesSlot(),
  format: formatSlot(),
}

export interface WaterfallStep {
  label: string
  value: number
  kind?: 'delta' | 'total'
}

export interface WaterfallProps extends Record<string, unknown> {
  steps: WaterfallStep[]
  connectors?: boolean
  colorBy?: 'sign' | 'single'
  valueLabels?: 'end' | 'none'
  gridlines?: 'major' | 'none'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: WaterfallProps = {
  steps: [
    { label: 'FY24 revenue', value: 120, kind: 'total' },
    { label: 'New logos', value: 35 },
    { label: 'Expansion', value: 18 },
    { label: 'Churn', value: -22 },
    { label: 'Pricing', value: 9 },
    { label: 'FY25 revenue', value: 160, kind: 'total' },
  ],
  connectors: true,
  colorBy: 'sign',
  valueLabels: 'end',
  gridlines: 'major',
}
