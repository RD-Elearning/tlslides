/**
 * Schema and defaults for tls.g.breakdown — one whole split into parts under a curly brace.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const BREAKDOWN_MIN = 2
export const BREAKDOWN_MAX = 6

export const schema: BlockSchema = {
  whole: {
    type: {
      kind: 'object',
      fields: {
        label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Whole' },
        value: { type: { kind: 'text', maxChars: 16 }, role: 'content', label: 'Value' },
      },
    },
    role: 'content',
    label: 'Whole',
    required: true,
    guidance: 'The thing being split: {label, value?}, e.g. {label: "Total cost", value: "$120k"}.',
  },
  parts: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Part' },
          value: { type: { kind: 'text', maxChars: 16 }, role: 'content', label: 'Value' },
          note: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Note' },
        },
      },
      min: BREAKDOWN_MIN,
      max: BREAKDOWN_MAX,
    },
    role: 'content',
    label: 'Parts',
    required: true,
    guidance: '{label, value?, note?} per part. Values like "$40k" or "25%".',
  },
  direction: enumSlot(['LR', 'TB'], 'Direction', 'LR = whole left, parts right; TB = whole on top.'),
  showShare: { type: { kind: 'boolean' }, role: 'option', label: 'Show share', help: 'Adds each part as % of the sum when every value is numeric.' },
}

export interface BreakdownProps extends Record<string, unknown> {
  whole: { label: string; value?: string }
  parts: Array<{ label: string; value?: string; note?: string }>
  direction?: 'LR' | 'TB'
  showShare?: boolean
}

export const defaults: BreakdownProps = {
  whole: { label: 'Total cost', value: '$120k' },
  parts: [
    { label: 'People', value: '$70k', note: 'Four engineers, part time' },
    { label: 'Cloud', value: '$30k', note: 'Hosting and data' },
    { label: 'Tools', value: '$20k', note: 'Licences' },
  ],
  direction: 'LR',
  showShare: false,
}
