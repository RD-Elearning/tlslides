/**
 * tls.c.frayer — spro sprint 2026-11b S08-3: the Frayer model for a term — its definition,
 * characteristics, examples and non-examples around the term. Cells: `../_rich.ts`.
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, strs, txt } from '../_rich-block'

export interface FrayerProps extends Record<string, unknown> {
  term: string
  definition: string
  traits: string[]
  examples: string[]
  nonExamples: string[]
  labels?: string[]
  variant?: 'quadrant' | 'stack'
}
const VARIANTS = ['quadrant', 'stack'] as const
const LABELS = ['Definition', 'Characteristics', 'Examples', 'Non-examples']

const list = (max: number, n: number) => ({ type: { kind: 'list' as const, of: { kind: 'text' as const, maxChars: 80 }, min: n, max } })
export const schema: BlockSchema = {
  term: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Term', required: true },
  definition: { type: { kind: 'text', maxChars: 220 }, role: 'content', label: 'Definition', required: true },
  traits: { ...list(4, 2), role: 'content', label: 'Characteristics', required: true },
  examples: { ...list(3, 1), role: 'content', label: 'Examples', required: true },
  nonExamples: { ...list(3, 1), role: 'content', label: 'Non-examples', required: true },
  labels: { type: { kind: 'list', of: { kind: 'text', maxChars: 24 }, min: 0, max: 4 }, role: 'content', label: 'Box titles', guidance: 'The four box titles in the deck language (definition, characteristics, examples, non-examples).' },
  variant: enumSlot([...VARIANTS], 'Variant', 'quadrant = four boxes under the term; stack = four rows.'),
}

export const defaults: FrayerProps = {
  term: 'Prime number',
  definition: 'A whole number greater than 1 whose only divisors are 1 and itself.',
  traits: ['Exactly two divisors', 'Every whole number > 1 is a product of primes'],
  examples: ['2, 3, 5, 7, 11', '97'],
  nonExamples: ['1 (one divisor)', '9 = 3 × 3'],
  labels: LABELS,
  variant: 'quadrant',
}

export const tlsCFrayer = defineRichBlock<FrayerProps>({
  type: 'tls.c.frayer',
  name: 'Frayer model',
  summary: 'A term with its definition, characteristics, examples and non-examples.',
  keywords: ['frayer', 'term', 'vocabulary', 'examples', 'non-examples', 'concept', 'thuật ngữ', 'ví dụ', 'phản ví dụ'],
  category: 'learning',
  shortDescription: 'A term with its definition, traits, examples and non-examples',
  related: ['tls.t.definition', 'tls.c.explainer', 'tls.c.glossary'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [800, 640] },
  describe: {
    when: 'Teach a term so it sticks: what it is, its characteristics, examples and the near-misses that are not it.',
    avoid: 'A definition alone: tls.t.definition. Several terms: tls.c.glossary.',
    example: { id: 'b_frayer', type: 'tls.c.frayer', props: { term: defaults.term, definition: defaults.definition, traits: defaults.traits, examples: defaults.examples, nonExamples: defaults.nonExamples } },
  },
  sections: { head: ['term'] },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'quadrant')
    const labels = strs(p.labels, 4)
    const L = (i: number) => labels[i] || LABELS[i]
    const items = [
      { lead: L(0), text: txt(p.definition, 220) },
      { lead: L(1), points: strs(p.traits, 4) },
      { lead: L(2), points: strs(p.examples, 3) },
      { lead: L(3), points: strs(p.nonExamples, 3) },
    ]
    const head = [{ spec: { id: 'term', type: 'tls.t.title', props: { text: txt(p.term, 40), size: 'heading', color: 'accent' } } }]
    if (v === 'stack') return { items: items.map(({ lead, ...rest }) => ({ ...rest, marker: lead })), head, opts: { columns: 1, marker: 'label', markerSide: 'left', labelShare: 0.24 } }
    return { items, head, opts: { columns: 2, card: 'card' } }
  },
})
