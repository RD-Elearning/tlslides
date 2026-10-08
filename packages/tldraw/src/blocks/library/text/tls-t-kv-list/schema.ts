/**
 * Schema and defaults for tls.t.kv-list — key and value pairs in aligned columns.
 */

import type { BlockSchema } from '../../../types'

export const KV_MAX_ITEMS = 10

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          key: { type: { kind: 'text', maxChars: 40 }, required: true, role: 'content', label: 'Key' },
          value: { type: { kind: 'text', maxChars: 80 }, required: true, role: 'content', label: 'Value' },
        },
      },
      min: 2,
      max: KV_MAX_ITEMS,
    },
    role: 'content',
    label: 'Pairs',
    required: true,
    guidance: 'Short labels as keys; keep values to a phrase or a number with its unit.',
  },
  leader: {
    type: { kind: 'enum', values: ['none', 'dots', 'rule'] },
    role: 'option',
    label: 'Leader',
    help: 'dots join key to value; rule draws a hairline under each row.',
  },
  valueAlign: {
    type: { kind: 'enum', values: ['end', 'start'] },
    role: 'option',
    label: 'Value alignment',
  },
  keyTone: {
    type: { kind: 'enum', values: ['muted', 'text'] },
    role: 'option',
    label: 'Key colour',
  },
  columns: {
    type: { kind: 'enum', values: ['1', '2'] },
    role: 'option',
    label: 'Columns',
  },
}

export interface KvItem {
  key: string
  value: string
}

export interface KvListProps extends Record<string, unknown> {
  items: KvItem[]
  leader?: 'none' | 'dots' | 'rule'
  valueAlign?: 'end' | 'start'
  keyTone?: 'muted' | 'text'
  columns?: '1' | '2'
}

export const defaults: KvListProps = {
  items: [
    { key: 'Date', value: '12 March 2026' },
    { key: 'Venue', value: 'Hall B, Convention Centre' },
    { key: 'Duration', value: '45 minutes' },
    { key: 'Format', value: 'Talk and live demo' },
    { key: 'Language', value: 'English' },
  ],
  leader: 'dots',
  valueAlign: 'end',
  keyTone: 'muted',
  columns: '1',
}
