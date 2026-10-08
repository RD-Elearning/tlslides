/**
 * Schema and defaults for tls.d.ranking — ranked leaderboard with value bars.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot, formatSlot } from '../_chart/schema-kit'

export const RANKING_MAX_ITEMS = 10

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 40 }, required: true, role: 'content', label: 'Name' },
          value: { type: { kind: 'number' }, required: true, role: 'content', label: 'Value' },
          note: { type: { kind: 'text', maxChars: 50 }, role: 'content', label: 'Note' },
        },
      },
      min: 3,
      max: RANKING_MAX_ITEMS,
    },
    role: 'content',
    label: 'Entries',
    required: true,
    guidance: 'Any order: sorted by value unless sort is none.',
  },
  showBars: boolSlot('Value bars'),
  medals: boolSlot('Medals for top three'),
  sort: enumSlot(['desc', 'asc', 'none'], 'Sort'),
  format: formatSlot(),
}

export interface RankingItem {
  label: string
  value: number
  note?: string
}

export interface RankingProps extends Record<string, unknown> {
  items: RankingItem[]
  showBars?: boolean
  medals?: boolean
  sort?: 'desc' | 'asc' | 'none'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: RankingProps = {
  items: [
    { label: 'Aurora Pro', value: 4820, note: 'Enterprise' },
    { label: 'Beacon', value: 3910, note: 'Mid-market' },
    { label: 'Cobalt Lite', value: 2740 },
    { label: 'Drift', value: 1980 },
    { label: 'Ember', value: 1210 },
  ],
  showBars: true,
  medals: true,
  sort: 'desc',
}
