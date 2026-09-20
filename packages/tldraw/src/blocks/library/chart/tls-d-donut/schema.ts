/**
 * Schema and defaults for tls.d.donut — donut chart.
 *
 * Phase 6.1: One exemplar for chart family.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  slices: {
    type: { kind: 'list', of: { kind: 'object', fields: {} }, min: 0, max: 6 },
    role: 'content',
    label: 'Slices',
    help: 'Data slices for the donut chart. Max 6 slices; excess grouped into "Other".',
  },
  total: {
    type: { kind: 'number' },
    role: 'option',
    label: 'Total',
    help: 'Total value for percentage calculation.',
  },
}

export interface DonutSlice {
  value: number
  color: string
  label?: string
}

export interface DonutProps extends Record<string, unknown> {
  slices?: DonutSlice[]
  total?: number
}

export const defaults: DonutProps = {
  slices: [],
  total: 100,
}