/**
 * tls.c.faq — spro sprint 2026-11b S08-6: 2–5 questions with full answers (information, not an
 * activity). Cells: `../_rich.ts`.
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface FaqProps extends Record<string, unknown> {
  pairs: Array<{ q: string; a: string }>
  columns?: '1' | '2'
  variant?: 'list' | 'grid' | 'bubbles'
}
const VARIANTS = ['list', 'grid', 'bubbles'] as const

export const schema: BlockSchema = {
  pairs: {
    type: { kind: 'list', of: objectOf({ q: { kind: 'text', maxChars: 110 }, a: { kind: 'text', maxChars: 260 } }), min: 2, max: 5 },
    role: 'content',
    label: 'Questions',
    required: true,
    guidance: '`q` = the question as a learner asks it (≤ 110), `a` = the full answer (≤ 260).',
  },
  columns: enumSlot(['1', '2'], 'Columns'),
  variant: enumSlot([...VARIANTS], 'Variant', 'list = rows; grid = two columns of cards; bubbles = each answer on a card.'),
}

export const defaults: FaqProps = {
  pairs: [
    { q: 'Do I need to attend every class?', a: 'Attendance counts for 10 % of the grade; missing more than 20 % of the sessions bars you from the final exam.' },
    { q: 'Can I resubmit an assignment?', a: 'Once, within a week of the feedback. The higher of the two marks counts.' },
    { q: 'Where are the slides?', a: 'On the course page after each class, with the reading for the next one.' },
  ],
  variant: 'list',
}

export const tlsCFaq = defineRichBlock<FaqProps>({
  type: 'tls.c.faq',
  name: 'FAQ',
  summary: 'Questions a learner asks, each with its full answer.',
  keywords: ['faq', 'questions', 'answers', 'q&a', 'hỏi đáp', 'câu hỏi thường gặp'],
  category: 'text',
  shortDescription: 'Frequent questions with full answers',
  related: ['tls.t.qa', 'tls.c.cornell', 'tls.c.question-wall'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 420] },
  describe: {
    when: 'Questions a learner will ask, each answered in full (rules, procedures, common doubts) — information, not a quiz.',
    avoid: 'Questions for the class to think about: tls.c.question-wall. One-line answers: tls.t.qa.',
    example: { id: 'b_faq', type: 'tls.c.faq', props: { pairs: defaults.pairs.slice(0, 2) } },
  },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'list')
    const items = rows<{ q?: unknown; a?: unknown }>(p.pairs, 5).map((r) => ({ lead: txt(r.q, 110), text: txt(r.a, 260) }))
    const two = v === 'grid' || p.columns === '2'
    return { items, opts: { columns: two ? 2 : 1, card: v === 'list' && !two ? 'none' : 'card', gap: 'md' } }
  },
})
