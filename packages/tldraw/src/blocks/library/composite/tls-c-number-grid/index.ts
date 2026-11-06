/**
 * tls.c.number-grid — spro sprint 2026-11b S09-2: 3–6 figures, each with what it counts and one line of
 * meaning. Figures are `value[i]` parts (count up), written in the deck language. Cells: `../_rich.ts`.
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface NumberGridProps extends Record<string, unknown> {
  stats: Array<{ value: string; unit?: string; label: string; text?: string }>
  variant?: 'tiles' | 'strip' | 'rows'
}
const VARIANTS = ['tiles', 'strip', 'rows'] as const

export const schema: BlockSchema = {
  stats: {
    type: { kind: 'list', of: objectOf({ value: { kind: 'text', maxChars: 10 }, unit: { kind: 'text', maxChars: 12 }, label: { kind: 'text', maxChars: 40 }, text: { kind: 'text', maxChars: 110 } }), min: 3, max: 6 },
    role: 'content',
    label: 'Figures',
    required: true,
    guidance: 'Each: `value` as the passage gives it (≤ 10, deck language), optional word `unit`, `label` = what is counted (≤ 40), `text` = what it means (one line, ≤ 110).',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'tiles (default, a card per figure), strip (one row, no cards) or rows (figure left of its text).'),
}

export const defaults: NumberGridProps = {
  stats: [
    { value: '71%', label: 'of the surface is water', text: 'Most of it is salt water in the oceans.' },
    { value: '2.5%', label: 'of the water is fresh', text: 'And two thirds of that is frozen in ice.' },
    { value: '0.3%', label: 'of fresh water is in lakes and rivers', text: 'The part people can reach easily.' },
  ],
  variant: 'tiles',
}

export const tlsCNumberGrid = defineRichBlock<NumberGridProps>({
  type: 'tls.c.number-grid',
  name: 'Number grid',
  summary: '3–6 figures, each with what it counts and one line of meaning.',
  keywords: ['numbers', 'figures', 'stats', 'facts', 'grid', 'số liệu', 'con số'],
  category: 'metric',
  shortDescription: '3–6 figures with labels and one line of meaning each',
  related: ['tls.c.kpi-row', 'tls.c.stat-explain', 'tls.c.feature-grid'],
  schema,
  defaults,
  size: { preferred: [1600, 640], min: [800, 440] },
  countUp: true,
  describe: {
    when: '3–6 figures from the passage, each with what it counts and what it means: facts at a glance with their meaning. Allowed in learning decks.',
    avoid: 'One figure that needs a paragraph: tls.c.stat-explain. KPIs with deltas: tls.c.kpi-row. A series over time: a chart.',
    example: { id: 'b_number_grid', type: 'tls.c.number-grid', props: { stats: defaults.stats } },
  },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'tiles')
    const items = rows<{ value?: unknown; unit?: unknown; label?: unknown; text?: unknown }>(p.stats, 6).map((x) => ({ value: txt(x.value, 10) || '—', unit: txt(x.unit, 12), lead: txt(x.label, 40), text: txt(x.text, 110) }))
    const n = items.length
    if (v === 'rows') return { items, opts: { columns: n >= 4 ? 2 : 1, marker: 'figure', markerSide: 'left', labelShare: 0.32 } }
    if (v === 'strip') return { items, opts: { columns: (n <= 4 ? n : 3) as 3 | 4, marker: 'figure', markerSide: 'top' } }
    return { items, opts: { columns: (n === 4 ? 2 : 3) as 2 | 3, marker: 'figure', markerSide: 'top', card: 'card' } }
  },
})
