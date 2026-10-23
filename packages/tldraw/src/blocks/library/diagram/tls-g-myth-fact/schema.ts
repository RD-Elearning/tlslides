/**
 * Schema and defaults for tls.g.myth-fact — misconceptions set right (vivid V4).
 */

import type { BlockSchema } from '../../../types'

export const MYTH_MAX = 4

export const schema: BlockSchema = {
  mythLabel: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'Myth heading', guidance: 'In the deck language: Myth / Ngộ nhận.' },
  factLabel: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'Fact heading', guidance: 'In the deck language: Fact / Sự thật.' },
  rows: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          myth: { type: { kind: 'text', maxChars: 90 }, required: true, role: 'content', label: 'Myth', guidance: 'The wrong belief, as people say it, one line.' },
          fact: { type: { kind: 'text', maxChars: 120 }, required: true, role: 'content', label: 'Fact', guidance: 'What is true instead, one or two lines.' },
        },
      },
      min: 1,
      max: MYTH_MAX,
    },
    role: 'content',
    label: 'Rows',
    required: true,
    guidance: '1-4 misconceptions, each with the fact that corrects it.',
  },
}

export interface MythFactRow {
  myth: string
  fact: string
}

export interface MythFactProps extends Record<string, unknown> {
  mythLabel?: string
  factLabel?: string
  rows: MythFactRow[]
}

export const defaults: MythFactProps = {
  mythLabel: 'Myth',
  factLabel: 'Fact',
  rows: [
    { myth: 'We only use 10% of our brain', fact: 'Brain scans show activity across almost every region, even during sleep' },
    { myth: 'Learning styles decide how you learn best', fact: 'Matching lessons to a "style" does not improve results; varied practice does' },
    { myth: 'Rereading is the best way to revise', fact: 'Testing yourself (retrieval practice) beats rereading for long-term memory' },
  ],
}
