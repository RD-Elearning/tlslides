/**
 * tls.c.worked-example — spro sprint 2026-11b S08-4: a problem traced step by step with the reason for
 * each step, then the result (and a check). Cells: `../_rich.ts`; formulas through `tls.t.formula`.
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import type { RichSection } from '../_rich'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface WorkedExampleProps extends Record<string, unknown> {
  problem: string
  formula?: string
  steps: Array<{ text: string; formula?: string; why?: string }>
  result: string
  check?: string
  labels?: { result?: string; check?: string }
  variant?: 'numbered' | 'two-column' | 'ledger'
}
const VARIANTS = ['numbered', 'two-column', 'ledger'] as const

export const schema: BlockSchema = {
  problem: { type: { kind: 'text', maxChars: 260 }, role: 'content', label: 'Problem', required: true, guidance: 'The problem as given (plain maths, no $…$).' },
  formula: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Formula', guidance: 'Optional: the formula used, `tls.t.formula` syntax (`_` / `^`, never Unicode sub/superscripts).' },
  steps: {
    type: { kind: 'list', of: objectOf({ text: { kind: 'text', maxChars: 140 }, formula: { kind: 'text', maxChars: 90 }, why: { kind: 'text', maxChars: 120 } }), min: 2, max: 6 },
    role: 'content',
    label: 'Steps',
    required: true,
    guidance: 'Each step: `text` = what is done, `formula` = the line of working (optional), `why` = the reason (optional).',
  },
  result: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Result', required: true },
  check: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Check', guidance: 'Optional: how to check the answer.' },
  labels: { type: objectOf({ result: { kind: 'text', maxChars: 20 }, check: { kind: 'text', maxChars: 20 } }), role: 'content', label: 'Labels', guidance: 'The words for "Result" and "Check" in the deck language.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'numbered = numbered rows; two-column = steps in two columns of cards; ledger = rows with no numbers.'),
}

export const defaults: WorkedExampleProps = {
  problem: 'A tree has 15 nodes and is perfectly balanced. What is its height?',
  steps: [
    { text: 'Put the node count into the formula', formula: '15 = 2^{h+1} - 1', why: 'A perfect binary tree of height h has 2^{h+1} - 1 nodes.' },
    { text: 'Add 1 to both sides', formula: '16 = 2^{h+1}' },
    { text: 'Take log base 2', formula: 'h + 1 = 4', why: '16 = 2^4.' },
  ],
  result: 'The height is h = 3.',
  labels: { result: 'Result', check: 'Check' },
  variant: 'numbered',
}

export const tlsCWorkedExample = defineRichBlock<WorkedExampleProps>({
  type: 'tls.c.worked-example',
  name: 'Worked example',
  summary: 'A problem solved step by step, each step with its working and reason, then the result.',
  keywords: ['worked example', 'solution', 'steps', 'calculation', 'trace', 'bài giải', 'ví dụ mẫu', 'lời giải'],
  category: 'learning',
  shortDescription: 'A problem solved step by step with reasons and the result',
  related: ['tls.c.steps', 'tls.t.formula', 'tls.t.code', 'tls.c.process-detail'],
  schema,
  defaults,
  size: { preferred: [1600, 820], min: [800, 680] },
  describe: {
    when: 'Show how to solve a problem: the problem, each step with its line of working and why, the result and a check.',
    avoid: 'A process with no calculation: tls.c.process-detail. One formula on its own: tls.t.formula.',
    example: { id: 'b_worked_example', type: 'tls.c.worked-example', props: { problem: defaults.problem, steps: defaults.steps.slice(0, 2), result: defaults.result } },
  },
  sections: { head: ['problem', 'formula'], foot: ['result', 'check'] },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'numbered')
    const labels = p.labels && typeof p.labels === 'object' ? p.labels : {}
    const items = rows<{ text?: unknown; formula?: unknown; why?: unknown }>(p.steps, 6).map((s) => ({ lead: txt(s.text, 140), formula: txt(s.formula, 90) || undefined, text: txt(s.why, 120) || undefined }))
    const head: RichSection[] = [{ spec: { id: 'problem', type: 'tls.t.body', props: { text: txt(p.problem, 260), size: 'lead' } } }]
    if (txt(p.formula)) head.push({ spec: { id: 'formula', type: 'tls.t.formula', props: { expression: txt(p.formula, 90), size: 'subheading', align: 'start' } } })
    const foot: RichSection[] = [{ spec: { id: 'result', type: 'tls.t.callout', props: { title: txt(labels.result, 20) || 'Result', text: txt(p.result, 140), variant: 'success', fill: 'tint' } } }]
    if (txt(p.check)) foot.push({ spec: { id: 'check', type: 'tls.t.body', props: { text: `${txt(labels.check, 20) || 'Check'}: ${txt(p.check, 120)}` } } })
    if (v === 'two-column') return { items, head, foot, opts: { columns: 2, marker: 'number', markerSide: 'top', card: 'card' } }
    if (v === 'ledger') return { items, head, foot, opts: { columns: 1, marker: 'none', gap: 'md' } }
    return { items, head, foot, opts: { columns: 1, marker: 'number', markerSide: 'left', gap: 'md' } }
  },
})
