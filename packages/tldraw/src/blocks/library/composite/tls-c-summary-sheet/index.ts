/**
 * tls.c.summary-sheet — spro sprint 2026-11b S08-11: an end-of-section recap a reader keeps: 3–6 key
 * ideas, an optional formula or definition box and a line to remember. Cells: `../_rich.ts`.
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import type { RichSection } from '../_rich'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface SummarySheetProps extends Record<string, unknown> {
  ideas: Array<{ title: string; text: string }>
  box?: { label?: string; text?: string; formula?: string }
  remember?: string
  rememberLabel?: string
  variant?: 'grid' | 'sheet'
}
const VARIANTS = ['grid', 'sheet'] as const

export const schema: BlockSchema = {
  ideas: {
    type: { kind: 'list', of: objectOf({ title: { kind: 'text', maxChars: 40 }, text: { kind: 'text', maxChars: 150 } }), min: 3, max: 6 },
    role: 'content',
    label: 'Key ideas',
    required: true,
    guidance: '`title` (≤ 40) and `text` = the idea in a sentence (≤ 150).',
  },
  box: { type: objectOf({ label: { kind: 'text', maxChars: 24 }, text: { kind: 'text', maxChars: 200 }, formula: { kind: 'text', maxChars: 90 } }), role: 'content', label: 'Box', guidance: 'Optional: a formula or a definition to keep (`label`, `text`, `formula`).' },
  remember: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Remember', guidance: 'Optional: the one line to remember.' },
  rememberLabel: { type: { kind: 'text', maxChars: 20 }, role: 'content', label: 'Remember label' },
  variant: enumSlot([...VARIANTS], 'Variant', 'grid = numbered cards; sheet = two columns of ideas, the box under them.'),
}

export const defaults: SummarySheetProps = {
  ideas: [
    { title: 'A tree has no cycles', text: 'There is exactly one path between any two nodes.' },
    { title: 'Height bounds the work', text: 'Search, insert and delete each take time proportional to the height.' },
    { title: 'Balance keeps it low', text: 'A balanced tree of n nodes has height about log2(n).' },
  ],
  box: { label: 'Formula', text: 'Nodes in a perfect tree of height h:', formula: 'n = 2^{h+1} - 1' },
  remember: 'Keep the tree balanced and every operation stays fast.',
  rememberLabel: 'Remember',
  variant: 'grid',
}

export const tlsCSummarySheet = defineRichBlock<SummarySheetProps>({
  type: 'tls.c.summary-sheet',
  name: 'Summary sheet',
  summary: 'A recap a reader keeps: 3–6 key ideas, a formula or definition box, a line to remember.',
  keywords: ['summary', 'recap', 'review', 'key ideas', 'tóm tắt', 'tổng kết', 'ghi nhớ'],
  category: 'learning',
  shortDescription: 'Recap of key ideas with a box to keep',
  related: ['tls.c.recap', 'tls.c.cornell', 'tls.c.key-points'],
  schema,
  defaults,
  size: { preferred: [1600, 820], min: [960, 700] },
  describe: {
    when: 'Close a section of a teaching deck with what to keep: the key ideas in a sentence each, the formula or definition, the line to remember.',
    avoid: 'A light recap of three phrases: tls.c.recap.',
    example: { id: 'b_summary_sheet', type: 'tls.c.summary-sheet', props: { ideas: defaults.ideas } },
  },
  sections: { foot: ['box', 'remember'] },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'grid')
    const items = rows<{ title?: unknown; text?: unknown }>(p.ideas, 6).map((r) => ({ lead: txt(r.title, 40), text: txt(r.text, 150) }))
    const foot: RichSection[] = []
    const box = p.box && typeof p.box === 'object' ? p.box : undefined
    if (box && (txt(box.text) || txt(box.formula))) {
      const text = [txt(box.text, 200), txt(box.formula, 90)].filter(Boolean).join('  ')
      foot.push({ spec: { id: 'box', type: 'tls.t.callout', props: { title: txt(box.label, 24) || 'Keep', text, variant: 'info', fill: 'tint' } } })
    }
    if (txt(p.remember)) foot.push({ spec: { id: 'remember', type: 'tls.t.title', props: { text: `${txt(p.rememberLabel, 20) || 'Remember'}: ${txt(p.remember, 140)}`, size: 'subheading', color: 'accent' } } })
    if (v === 'sheet') return { items, foot, opts: { columns: 2, marker: 'none' } }
    return { items, foot, opts: { columns: (items.length % 3 === 0 ? 3 : 2) as 2 | 3, marker: 'number', markerSide: 'top', card: 'card', gap: 'md' } }
  },
})
