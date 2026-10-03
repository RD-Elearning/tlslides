/**
 * Schema and defaults for tls.g.iceberg — what is visible above the waterline vs hidden below.
 */

import type { BlockSchema, SlotSpec } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const ABOVE_MAX = 4
export const BELOW_MAX = 6

const half = (label: string, max: number, guidance: string): SlotSpec => ({
  type: {
    kind: 'object',
    fields: {
      label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Heading' },
      items: { type: { kind: 'list', of: { kind: 'text', maxChars: 40 }, min: 1, max }, required: true, role: 'content', label: 'Items' },
    },
  },
  role: 'content',
  label,
  required: true,
  guidance,
})

export const schema: BlockSchema = {
  above: half('Above the waterline', ABOVE_MAX, '{label, items[1-4]}: what everyone sees.'),
  below: half('Below the waterline', BELOW_MAX, '{label, items[1-6]}: what is hidden.'),
  waterline: enumSlot(['third', 'half'], 'Waterline', 'third = the tip takes a third of the height.'),
}

export interface IcebergHalf {
  label: string
  items: string[]
}

export interface IcebergProps extends Record<string, unknown> {
  above: IcebergHalf
  below: IcebergHalf
  waterline?: 'third' | 'half'
}

export const defaults: IcebergProps = {
  above: { label: 'What we see', items: ['Late deliveries', 'Rising churn'] },
  below: { label: 'What causes it', items: ['Unclear ownership', 'Manual handoffs', 'Old tooling', 'No shared metrics'] },
  waterline: 'third',
}
