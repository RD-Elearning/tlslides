/**
 * tls.c.glossary — spro sprint 2026-11b S08-7: 4–8 terms with their definitions. Cells: `../_rich.ts`.
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface GlossaryProps extends Record<string, unknown> {
  terms: Array<{ term: string; definition: string }>
  marker?: 'letter' | 'none'
  variant?: 'two-column' | 'cards' | 'index'
}
const VARIANTS = ['two-column', 'cards', 'index'] as const

export const schema: BlockSchema = {
  terms: {
    type: { kind: 'list', of: objectOf({ term: { kind: 'text', maxChars: 40 }, definition: { kind: 'text', maxChars: 170 } }), min: 4, max: 8 },
    role: 'content',
    label: 'Terms',
    required: true,
    guidance: '`term` (≤ 40) and its `definition` in one or two sentences (≤ 170).',
  },
  marker: enumSlot(['letter', 'none'], 'Marker', 'letter = each term led by A, B, C…; none (default).'),
  variant: enumSlot([...VARIANTS], 'Variant', 'two-column = two columns of entries; cards = a card per term; index = one column with the term in a left rail.'),
}

export const defaults: GlossaryProps = {
  terms: [
    { term: 'Node', definition: 'One element of the tree; it holds a value and links to its children.' },
    { term: 'Root', definition: 'The only node with no parent; every path starts here.' },
    { term: 'Leaf', definition: 'A node with no children.' },
    { term: 'Height', definition: 'The number of edges on the longest path from the root to a leaf.' },
  ],
  variant: 'two-column',
}

export const tlsCGlossary = defineRichBlock<GlossaryProps>({
  type: 'tls.c.glossary',
  name: 'Glossary',
  summary: '4–8 terms with their definitions.',
  keywords: ['glossary', 'terms', 'vocabulary', 'definitions', 'thuật ngữ', 'bảng thuật ngữ', 'từ vựng'],
  category: 'learning',
  shortDescription: 'Several terms with their definitions',
  related: ['tls.t.kv-list', 'tls.t.definition', 'tls.c.frayer'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [800, 480] },
  describe: {
    when: 'The vocabulary of a lesson: 4–8 terms, each with a definition of a sentence or two.',
    avoid: 'Short label–value pairs: tls.t.kv-list. One term in depth: tls.c.frayer or tls.t.definition.',
    example: { id: 'b_glossary', type: 'tls.c.glossary', props: { terms: defaults.terms } },
  },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'two-column')
    const list = rows<{ term?: unknown; definition?: unknown }>(p.terms, 8)
    if (v === 'index') return { items: list.map((r) => ({ marker: txt(r.term, 40), text: txt(r.definition, 170) })), opts: { columns: 1, marker: 'label', markerSide: 'left', labelShare: 0.28, gap: 'md' } }
    const items = list.map((r) => ({ lead: txt(r.term, 40), text: txt(r.definition, 170) }))
    return { items, opts: { columns: 2, marker: p.marker === 'letter' ? 'letter' : 'none', markerSide: 'left', card: v === 'cards' ? 'card' : 'none', gap: 'md' } }
  },
})
