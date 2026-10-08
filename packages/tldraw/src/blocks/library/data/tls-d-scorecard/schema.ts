/**
 * Schema and defaults for tls.d.scorecard — metric rows with value, target and status.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot } from '../_chart/schema-kit'

export const SCORECARD_MAX_ITEMS = 10

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 50 }, required: true, role: 'content', label: 'Metric' },
          value: { type: { kind: 'text', maxChars: 20 }, required: true, role: 'content', label: 'Value' },
          target: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'Target' },
          status: { type: { kind: 'enum', values: ['good', 'watch', 'bad', 'none'] }, required: true, role: 'content', label: 'Status' },
          note: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Note' },
        },
      },
      min: 2,
      max: SCORECARD_MAX_ITEMS,
    },
    role: 'content',
    label: 'Metrics',
    required: true,
    guidance: 'Values and targets are text with units ("$4.2M", "98%").',
  },
  showTarget: { ...boolSlot('Show target'), toggles: 'target' },
  statusStyle: enumSlot(['dot', 'pill', 'bar'], 'Status style', 'bar = colour strip at the row start, no status column'),
  showNote: { ...boolSlot('Show note'), toggles: 'note' },
}

export interface ScorecardItem {
  label: string
  value: string
  target?: string
  status: 'good' | 'watch' | 'bad' | 'none'
  note?: string
}

export interface ScorecardProps extends Record<string, unknown> {
  items: ScorecardItem[]
  showTarget?: boolean
  statusStyle?: 'dot' | 'pill' | 'bar'
  showNote?: boolean
}

export const defaults: ScorecardProps = {
  items: [
    { label: 'Revenue', value: '$4.2M', target: '$4.0M', status: 'good', note: 'Two enterprise deals closed early' },
    { label: 'Churn', value: '3.1%', target: '2.5%', status: 'watch', note: 'Concentrated in the SMB tier' },
    { label: 'NPS', value: '41', target: '50', status: 'bad', note: 'Support wait times up' },
    { label: 'Uptime', value: '99.97%', target: '99.9%', status: 'good' },
  ],
  showTarget: true,
  statusStyle: 'dot',
  showNote: true,
}
