/**
 * tls.c.process-detail — spro sprint 2026-11b S08-9: the steps of a method, each with what is done and
 * why. Cells: `../_rich.ts`.
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface ProcessDetailProps extends Record<string, unknown> {
  steps: Array<{ title: string; text: string; icon?: string }>
  variant?: 'vertical' | 'zigzag' | 'two-column'
}
const VARIANTS = ['vertical', 'zigzag', 'two-column'] as const

export const schema: BlockSchema = {
  steps: {
    type: { kind: 'list', of: objectOf({ title: { kind: 'text', maxChars: 60 }, text: { kind: 'text', maxChars: 220 }, icon: { kind: 'icon' } }), min: 3, max: 6 },
    role: 'content',
    label: 'Steps',
    required: true,
    guidance: '`title` = the step (≤ 60), `text` = how and why (≤ 220).',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'vertical = numbered rows; zigzag = two columns, numbers on top; two-column = a card per step.'),
}

export const defaults: ProcessDetailProps = {
  steps: [
    { title: 'State the question', text: 'Write what you want to find out in one sentence, so you know what data to collect.' },
    { title: 'Collect the data', text: 'Measure the same way every time and note the conditions, so the results can be compared.' },
    { title: 'Draw a conclusion', text: 'Compare the results with your prediction and say what they show — and what they do not.' },
  ],
  variant: 'vertical',
}

export const tlsCProcessDetail = defineRichBlock<ProcessDetailProps>({
  type: 'tls.c.process-detail',
  name: 'Detailed process',
  summary: '3–6 steps of a method, each with a title and a description of how and why.',
  keywords: ['process', 'steps', 'method', 'procedure', 'how to', 'quy trình', 'các bước', 'phương pháp'],
  category: 'process',
  shortDescription: 'Steps of a method, each with how and why',
  related: ['tls.c.steps', 'tls.g.flow', 'tls.c.worked-example', 'tls.c.timeline-detail'],
  schema,
  defaults,
  size: { preferred: [1600, 820], min: [800, 480] },
  describe: {
    when: 'A method or procedure the reader follows: 3–6 steps, each with what to do and why, in 1–2 sentences.',
    avoid: 'Steps named in a few words: tls.c.steps. A calculation: tls.c.worked-example.',
    example: { id: 'b_process_detail', type: 'tls.c.process-detail', props: { steps: defaults.steps } },
  },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'vertical')
    const items = rows<{ title?: unknown; text?: unknown }>(p.steps, 6).map((r) => ({ lead: txt(r.title, 60), text: txt(r.text, 220) }))
    if (v === 'zigzag') return { items, opts: { columns: 2, marker: 'number', markerSide: 'top' } }
    if (v === 'two-column') return { items, opts: { columns: 2, marker: 'number', markerSide: 'left', card: 'card', gap: 'md' } }
    return { items, opts: { columns: 1, marker: 'number', markerSide: 'left', gap: 'md' } }
  },
})
