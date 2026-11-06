/**
 * tls.c.cornell — spro sprint 2026-11b S08-5: Cornell notes — cue questions on the left, notes on the
 * right, a summary bar at the foot. Cells: `../_rich.ts` (the cue is the cell's label column).
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface CornellProps extends Record<string, unknown> {
  rows: Array<{ cue: string; note: string }>
  summary: string
  summaryLabel?: string
  variant?: 'classic' | 'boxed'
}
const VARIANTS = ['classic', 'boxed'] as const

export const schema: BlockSchema = {
  rows: {
    type: { kind: 'list', of: objectOf({ cue: { kind: 'text', maxChars: 60 }, note: { kind: 'text', maxChars: 220 } }), min: 2, max: 5 },
    role: 'content',
    label: 'Rows',
    required: true,
    guidance: '`cue` = a question or keyword (≤ 60), `note` = the note that answers it (≤ 220).',
  },
  summary: { type: { kind: 'text', maxChars: 220 }, role: 'content', label: 'Summary', required: true, guidance: 'The whole page in 1–2 sentences.' },
  summaryLabel: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'Summary label', guidance: 'The word for "Summary" in the deck language.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'classic = ruled rows; boxed = each row on a card.'),
}

export const defaults: CornellProps = {
  rows: [
    { cue: 'What is photosynthesis?', note: 'Plants turn light, water and carbon dioxide into sugar and oxygen in their leaves.' },
    { cue: 'Where does it happen?', note: 'In the chloroplasts, mostly in the leaf cells facing the light.' },
    { cue: 'Why does it matter?', note: 'It feeds almost every food chain and puts the oxygen we breathe into the air.' },
  ],
  summary: 'Photosynthesis stores the energy of light as sugar and releases oxygen.',
  summaryLabel: 'Summary',
  variant: 'classic',
}

export const tlsCCornell = defineRichBlock<CornellProps>({
  type: 'tls.c.cornell',
  name: 'Cornell notes',
  summary: 'Cue questions beside the notes that answer them, with a summary at the foot.',
  keywords: ['cornell', 'notes', 'cue', 'questions', 'study notes', 'summary', 'ghi chú', 'câu hỏi gợi ý'],
  category: 'learning',
  shortDescription: 'Cue questions beside their notes, with a summary',
  related: ['tls.c.faq', 'tls.c.summary-sheet', 'tls.t.qa'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [800, 480] },
  describe: {
    when: 'Study notes a reader reviews: a cue question or keyword per row, the note that answers it, and the page summary.',
    avoid: 'Questions with one-line answers for the class: tls.t.qa. A recap of ideas without cues: tls.c.summary-sheet.',
    example: { id: 'b_cornell', type: 'tls.c.cornell', props: { rows: defaults.rows.slice(0, 2), summary: defaults.summary } },
  },
  sections: { foot: ['summary'] },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'classic')
    const items = rows<{ cue?: unknown; note?: unknown }>(p.rows, 5).map((r) => ({ marker: txt(r.cue, 60), text: txt(r.note, 220) }))
    const foot = [{ spec: { id: 'summary', type: 'tls.t.callout', props: { title: txt(p.summaryLabel, 20) || 'Summary', text: txt(p.summary, 220), variant: 'info', fill: 'tint' } } }]
    return { items, foot, opts: { columns: 1, marker: 'label', markerSide: 'left', labelShare: 0.3, card: v === 'boxed' ? 'card' : 'none', gap: 'md' } }
  },
})
