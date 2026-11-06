/**
 * tls.c.timeline-detail — spro sprint 2026-11b S08-8: a timeline whose events carry a paragraph each.
 * Cells: `../_rich.ts` (the date is the cell's label).
 */
import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { defineRichBlock, objectOf, rows, txt } from '../_rich-block'

export interface TimelineDetailProps extends Record<string, unknown> {
  events: Array<{ date: string; title: string; text: string }>
  variant?: 'left-rail' | 'zigzag' | 'cards'
}
const VARIANTS = ['left-rail', 'zigzag', 'cards'] as const

export const schema: BlockSchema = {
  events: {
    type: { kind: 'list', of: objectOf({ date: { kind: 'text', maxChars: 24 }, title: { kind: 'text', maxChars: 60 }, text: { kind: 'text', maxChars: 200 } }), min: 3, max: 6 },
    role: 'content',
    label: 'Events',
    required: true,
    guidance: '`date` (a year, a date or a period, ≤ 24), `title` (≤ 60) and `text` = what happened and why it matters (≤ 200).',
  },
  variant: enumSlot([...VARIANTS], 'Variant', 'left-rail = dates in a left rail; zigzag = two columns; cards = a card per event.'),
}

export const defaults: TimelineDetailProps = {
  events: [
    { date: '1936', title: 'Turing machine', text: 'Turing describes a machine that can compute anything computable, the model of every computer since.' },
    { date: '1945', title: 'Stored program', text: 'Von Neumann proposes keeping the program in memory with the data, so a machine can change tasks without rewiring.' },
    { date: '1971', title: 'Microprocessor', text: 'Intel puts a whole processor on one chip; computers start to fit on a desk.' },
  ],
  variant: 'left-rail',
}

export const tlsCTimelineDetail = defineRichBlock<TimelineDetailProps>({
  type: 'tls.c.timeline-detail',
  name: 'Detailed timeline',
  summary: 'A timeline of 3–6 events, each with a date, a title and a paragraph.',
  keywords: ['timeline', 'history', 'events', 'dates', 'chronology', 'mốc thời gian', 'lịch sử', 'dòng thời gian'],
  category: 'timeline',
  shortDescription: 'Timeline events, each with a date, title and paragraph',
  related: ['tls.g.timeline', 'tls.g.roadmap', 'tls.c.process-detail'],
  schema,
  defaults,
  size: { preferred: [1600, 820], min: [800, 640] },
  describe: {
    when: 'A history or a chronology a reader studies: 3–6 dated events, each with what happened and why it matters.',
    avoid: 'Dates with a label only: tls.g.timeline. Steps of a method: tls.c.process-detail.',
    example: { id: 'b_timeline_detail', type: 'tls.c.timeline-detail', props: { events: defaults.events } },
  },
  shape: (p) => {
    const v = pick(p.variant, VARIANTS, 'left-rail')
    const list = rows<{ date?: unknown; title?: unknown; text?: unknown }>(p.events, 6)
    const items = list.map((r) => ({ marker: txt(r.date, 24), lead: txt(r.title, 60), text: txt(r.text, 200) }))
    if (v === 'zigzag') return { items, opts: { columns: 2, marker: 'label', markerSide: 'top', gap: 'lg' } }
    if (v === 'cards') return { items, opts: { columns: items.length === 3 ? 3 : 2, marker: 'label', markerSide: 'top', card: 'card' } }
    return { items, opts: { columns: 1, marker: 'label', markerSide: 'left', labelShare: 0.18, gap: 'md' } }
  },
})
