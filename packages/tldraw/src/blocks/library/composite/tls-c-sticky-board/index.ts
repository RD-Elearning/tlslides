/**
 * tls.c.sticky-board — spro creative CR8 (PLAN Appendix C.1): two to eight sticky notes in a grid or columns, in the palette's note colours.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface StickyBoardProps extends Record<string, unknown> {
  title?: string
  notes: Array<{ text: string; group?: string }>
  variant?: 'grid' | 'scattered' | 'columns'
}
const VARIANTS = ['grid', 'scattered', 'columns'] as const
const NOTE_SURFACES = ['surfaceAlt', 'accent', 'accent2'] as const

export const schema: BlockSchema = {
  title: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Title' },
  notes: { type: { kind: 'list', of: { kind: 'object', fields: { text: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Note', required: true }, group: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Group' } } }, min: 2, max: 8 }, role: 'content', label: 'Notes', required: true },
  variant: enumSlot([...VARIANTS], 'Variant', 'columns: two columns of notes.'),
}

export const defaults: StickyBoardProps = { title: 'What we heard', notes: [{ text: 'Too many forms at arrival' }, { text: 'Nobody knows the wait' }, { text: 'Beds free up late' }, { text: 'Doctors chase results' }, { text: 'Patients come back' }, { text: 'Night shift is short' }], variant: 'grid' }

function cells(props: StickyBoardProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'grid')
  const notes = (Array.isArray(props.notes) ? props.notes : []).filter((n) => n && typeof n === 'object' && n.text).slice(0, 8)
  const main: Cell[] = []
  if (props.title) main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: props.title, size: 'heading' } } })
  const cards: BlockSpec[] = notes.map((n, i) => ({ id: `note-${i}`, type: 'tls.l.card', props: { padding: 'lg', children: [{ id: `note-text-${i}`, type: 'tls.t.body', props: { text: n.text, size: 'lead' } }], $block: { style: { surface: NOTE_SURFACES[i % NOTE_SURFACES.length] } } } }))
  const columns = v === 'columns' ? 2 : Math.min(4, notes.length <= 4 ? notes.length : Math.ceil(notes.length / 2))
  if (cards.length) main.push({ spec: { id: 'notes', type: 'tls.l.grid', props: { columns: Math.max(1, columns), gap: 'lg', sizing: 'equal', children: cards } }, group: 'note', grid: { columns: Math.max(1, columns), items: cards } })
  return { main, opts: {} }
}

export function buildStickyBoard(props: StickyBoardProps): BlockSpec {
  const c = cells(props)
  return posterBuild('sticky_board', c.main, c.opts.side)
}

export function layoutStickyBoard(props: StickyBoardProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<StickyBoardProps>({
  type: 'tls.c.sticky-board',
  name: 'Sticky board',
  family: 'composite',
  tier: 'A',
  summary: 'Two to eight sticky notes on a board, for ideas, voices or findings.',
  keywords: ["sticky notes", "board", "ideas", "brainstorm", "workshop", "voices"],
  category: 'list',
  scope: 'slide',
  shortDescription: 'Sticky notes on a board',
  related: ["tls.c.question-wall", "tls.t.tags", "tls.c.cards"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [960, 540] },
  describe: {
    when: 'Show several short ideas, quotes or findings as notes (workshops, playful decks).',
    avoid: 'Ordered steps: tls.c.steps. Long items: tls.c.cards.',
    example: { id: 'b_sticky_board', type: 'tls.c.sticky-board', props: { title: 'What we heard', notes: [{ text: 'Too many forms' }, { text: 'Nobody knows the wait' }, { text: 'Beds free up late' }] } },
  },
  motion: {
    parts: ["title", "note"],
    preset: 'fade-up',
    partMotion: {
      'title': { preset: 'fade-up', delay: 0, stagger: 60 },
      'note': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildStickyBoard,
})

export const tlsCStickyBoard: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: StickyBoardProps, ctx: LayoutContext): LayoutNode => layoutStickyBoard(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: StickyBoardProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
