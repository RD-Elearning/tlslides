/**
 * tls.c.flashcards — spro creative CR8 (PLAN Appendix C.1): two to six term cards: the term on top, its meaning under it.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface FlashcardsProps extends Record<string, unknown> {
  cards: Array<{ term: string; back?: string }>
  variant?: 'grid' | 'fan'
}
const VARIANTS = ['grid', 'fan'] as const

export const schema: BlockSchema = {
  cards: { type: { kind: 'list', of: { kind: 'object', fields: { term: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'Term', required: true }, back: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Meaning' } } }, min: 2, max: 6 }, role: 'content', label: 'Cards', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: FlashcardsProps = { cards: [{ term: 'Feature', back: 'A measured property of each example' }, { term: 'Label', back: 'The answer the model learns to give' }, { term: 'Overfitting', back: 'Learning the noise instead of the rule' }], variant: 'grid' }

function cells(props: FlashcardsProps): { main: Cell[]; opts: PosterOptions } {
  const cards = (Array.isArray(props.cards) ? props.cards : []).filter((c) => c && typeof c === 'object' && c.term).slice(0, 6)
  const specs: BlockSpec[] = cards.map((c, i) => ({ id: `card-${i}`, type: 'tls.l.card', props: { padding: 'lg', children: [{ id: `term-${i}`, type: 'tls.t.title', props: { text: c.term, size: 'subheading' } }, ...(c.back ? [{ id: `back-${i}`, type: 'tls.t.body', props: { text: c.back } }] : [])], $block: { style: { surface: 'surfaceAlt' } } } }))
  const columns = cards.length <= 3 ? cards.length : Math.ceil(cards.length / 2)
  return { main: specs.length ? [{ spec: { id: 'cards', type: 'tls.l.grid', props: { columns: Math.max(1, columns), gap: 'lg', sizing: 'equal', children: specs } }, group: 'card', grid: { columns: Math.max(1, columns), items: specs } }] : [], opts: {} }
}

export function buildFlashcards(props: FlashcardsProps): BlockSpec {
  const c = cells(props)
  return posterBuild('flashcards', c.main, c.opts.side)
}

export function layoutFlashcards(props: FlashcardsProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<FlashcardsProps>({
  type: 'tls.c.flashcards',
  name: 'Flashcards',
  family: 'composite',
  tier: 'A',
  summary: 'Two to six flashcards with a term and its meaning.',
  keywords: ["flashcards", "terms", "vocabulary", "definitions", "revision"],
  category: 'learning',
  scope: 'slide',
  shortDescription: 'Flashcards: terms and their meanings',
  related: ["tls.t.definition", "tls.c.cards", "tls.c.quiz"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'Teach or revise a few terms with their meanings.',
    avoid: 'One term in depth: tls.t.definition.',
    example: { id: 'b_flashcards', type: 'tls.c.flashcards', props: { cards: [{ term: 'Feature', back: 'A measured property' }, { term: 'Label', back: 'The answer to learn' }] } },
  },
  motion: {
    parts: ["card"],
    preset: 'fade-up',
    partMotion: {
      'card': { preset: 'fade-up', delay: 0, stagger: 60 },
    },
  },
  build: buildFlashcards,
})

export const tlsCFlashcards: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: FlashcardsProps, ctx: LayoutContext): LayoutNode => layoutFlashcards(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: FlashcardsProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
