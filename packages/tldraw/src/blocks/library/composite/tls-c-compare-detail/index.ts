/**
 * tls.c.compare-detail — spro sprint 2026-11b S08-10: 2–3 options compared in depth, each a heading, a
 * summary and its points, with an optional verdict. Cells: `../_rich.ts`.
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, objectOf, rows, strs, txt } from '../_rich-block'

export interface CompareDetailProps extends Record<string, unknown> {
  columns: Array<{ heading: string; summary: string; points?: string[] }>
  verdict?: string
  verdictLabel?: string
  variant?: 'columns' | 'cards' | 'versus'
}
const VARIANTS = ['columns', 'cards', 'versus'] as const

export const schema: BlockSchema = {
  columns: {
    type: { kind: 'list', of: objectOf({ heading: { kind: 'text', maxChars: 40 }, summary: { kind: 'text', maxChars: 200 }, points: { kind: 'list', of: { kind: 'text', maxChars: 90 }, min: 0, max: 4 } }), min: 2, max: 3 },
    role: 'content',
    label: 'Options',
    required: true,
    guidance: 'Each option: `heading` (≤ 40), `summary` (≤ 200), `points` (0–4, ≤ 90 each).',
  },
  verdict: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Verdict', guidance: 'Optional: when to choose which.' },
  verdictLabel: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'Verdict label' },
  variant: enumSlot([...VARIANTS], 'Variant', 'columns = side by side; cards = a card per option; versus = two cards with letters.'),
}

export const defaults: CompareDetailProps = {
  columns: [
    { heading: 'Array', summary: 'Items side by side in memory, found by their index.', points: ['Read any item at once', 'Inserting in the middle moves the rest'] },
    { heading: 'Linked list', summary: 'Items scattered in memory, each pointing to the next.', points: ['Insert anywhere by relinking', 'Reading item k walks k links'] },
  ],
  verdict: 'Read often → array; insert and delete often → linked list.',
  verdictLabel: 'When to use',
  variant: 'columns',
}

export const tlsCCompareDetail = defineRichBlock<CompareDetailProps>({
  type: 'tls.c.compare-detail',
  name: 'Detailed comparison',
  summary: '2–3 options compared in depth: heading, summary and points each, then a verdict.',
  keywords: ['compare', 'comparison', 'versus', 'options', 'trade-off', 'so sánh', 'ưu nhược'],
  category: 'comparison',
  shortDescription: 'Options compared in depth with a verdict',
  related: ['tls.c.comparison', 'tls.d.compare-table', 'tls.g.pros-cons'],
  schema,
  defaults,
  size: { preferred: [1600, 820], min: [800, 480] },
  describe: {
    when: 'Compare 2–3 options a reader must choose between, each explained with a summary and its points, and say when to pick which.',
    avoid: 'Many criteria in a grid: tls.d.compare-table. Two short columns of labels: tls.c.comparison.',
    example: { id: 'b_compare_detail', type: 'tls.c.compare-detail', props: { columns: defaults.columns } },
  },
  sections: { foot: ['verdict'] },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'columns')
    const list = rows<{ heading?: unknown; summary?: unknown; points?: unknown }>(p.columns, 3)
    const items = list.map((r) => ({ lead: txt(r.heading, 40), text: txt(r.summary, 200), points: strs(r.points, 4) }))
    const foot = txt(p.verdict) ? [{ spec: { id: 'verdict', type: 'tls.t.callout', props: { title: txt(p.verdictLabel, 20) || 'Verdict', text: txt(p.verdict, 160), variant: 'info', fill: 'tint' } } }] : []
    const cols = (items.length === 3 ? 3 : 2) as 2 | 3
    if (v === 'versus') return { items, foot, opts: { columns: cols, marker: 'letter', markerSide: 'top', card: 'card' } }
    return { items, foot, opts: { columns: cols, card: v === 'cards' ? 'card' : 'none' } }
  },
})
