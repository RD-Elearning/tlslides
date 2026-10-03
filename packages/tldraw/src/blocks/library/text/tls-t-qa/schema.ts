/**
 * Schema and defaults for tls.t.qa — question and answer pairs.
 *
 * No `reveal` option: answers-on-click would need a per-part `trigger` in `motion.parts`, and
 * `PartMotionSpec` has only preset/duration/delay/ease. Recorded as a gap in the P1 phase file.
 */

import type { BlockSchema } from '../../../types'

export const QA_MAX_ITEMS = 5

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          q: { type: { kind: 'text', maxChars: 140 }, required: true, role: 'content', label: 'Question' },
          a: { type: { kind: 'richText', maxChars: 280 }, required: true, role: 'content', label: 'Answer' },
        },
      },
      min: 1,
      max: QA_MAX_ITEMS,
    },
    role: 'content',
    label: 'Questions',
    required: true,
    guidance: 'Questions as the audience would ask them; answers one to two sentences.',
  },
  marker: {
    type: { kind: 'enum', values: ['qa', 'numbered', 'none'] },
    role: 'option',
    label: 'Marker',
    help: 'qa shows "Q" and "A" badges; numbered numbers the questions.',
  },
}

export interface QaItem {
  q: string
  a: string
}

export interface QaProps extends Record<string, unknown> {
  items: QaItem[]
  marker?: 'qa' | 'numbered' | 'none'
}

export const defaults: QaProps = {
  items: [
    { q: 'What problem does this solve?', a: 'It turns **hours of manual reporting** into a one-click export.' },
    { q: 'Who is it for?', a: 'Analysts and team leads who present weekly numbers.' },
    { q: 'How long does setup take?', a: 'About ten minutes, with no engineering help.' },
  ],
  marker: 'qa',
}
