/**
 * Schema and defaults for tls.c.agenda — agenda / table-of-contents.
 *
 * Each agenda item has a title and an optional note. A `current` prop
 * highlights one item (0-based index) with the accent colour; the rest
 * are muted.
 */

import type { BlockSchema } from '../../../types'

export interface AgendaItem {
  title: string
  note?: string
}

export interface AgendaProps extends Record<string, unknown> {
  items: AgendaItem[]
  current?: number | null
}

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          title: { type: { kind: 'text' }, required: true, role: 'content', label: 'Item title' },
          note: { type: { kind: 'text' }, role: 'content', label: 'Item note' },
        },
      },
      min: 1,
      max: 12,
    },
    role: 'content',
    label: 'Agenda items',
    help: 'Agenda items. Each item has a title and an optional note.',
    required: true,
    guidance: '3–8 items. Each title should be 1–6 words. Notes are optional and brief.',
  },
  current: {
    type: { kind: 'number' },
    role: 'option',
    label: 'Current item',
    help: 'Index of the currently highlighted item (0-based). Omit or set to null to highlight none.',
  },
}

export const defaults: AgendaProps = {
  items: [
    { title: 'Opening', note: 'Welcome and agenda overview' },
    { title: 'Q3 Results', note: 'Revenue and growth metrics' },
    { title: 'Strategy', note: 'Next quarter priorities' },
    { title: 'Q&A', note: 'Questions and discussion' },
  ],
  current: 1,
}
