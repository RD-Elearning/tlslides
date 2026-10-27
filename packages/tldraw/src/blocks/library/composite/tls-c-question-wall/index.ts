/**
 * tls.c.question-wall — spro creative CR8 (PLAN Appendix C.1): anticipated questions as notes, for the Q&A.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface QuestionWallProps extends Record<string, unknown> {
  title?: string
  questions: string[]
  variant?: 'grid' | 'scattered'
}
const VARIANTS = ['grid', 'scattered'] as const

export const schema: BlockSchema = {
  title: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Title' },
  questions: { type: { kind: 'list', of: { kind: 'text', maxChars: 90 }, min: 3, max: 8 }, role: 'content', label: 'Questions', required: true, guidance: 'Questions the audience is likely to ask, from the content.' },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: QuestionWallProps = { title: 'Questions you may have', questions: ['Does it need new staff?', 'How long did the test run?', 'What did it cost?', 'Will it work on night shifts?'], variant: 'grid' }

function cells(props: QuestionWallProps): { main: Cell[]; opts: PosterOptions } {
  const qs = strings(props.questions, 8)
  const main: Cell[] = []
  if (props.title) main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: props.title, size: 'heading' } } })
  const cards: BlockSpec[] = qs.map((q, i) => ({ id: `question-${i}`, type: 'tls.l.card', props: { padding: 'lg', children: [{ id: `question-text-${i}`, type: 'tls.t.body', props: { text: q, size: 'lead' } }], $block: { style: { surface: i % 2 ? 'surfaceAlt' : 'accent' } } } }))
  if (cards.length) main.push({ spec: { id: 'questions', type: 'tls.l.grid', props: { columns: qs.length <= 4 ? Math.max(1, Math.min(qs.length, 2)) : 3, gap: 'lg', sizing: 'equal', children: cards } }, group: 'question', grid: { columns: qs.length <= 4 ? Math.max(1, Math.min(qs.length, 2)) : 3, items: cards } })
  return { main, opts: {} }
}

export function buildQuestionWall(props: QuestionWallProps): BlockSpec {
  const c = cells(props)
  return posterBuild('question_wall', c.main, c.opts.side)
}

export function layoutQuestionWall(props: QuestionWallProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<QuestionWallProps>({
  type: 'tls.c.question-wall',
  name: 'Question wall',
  family: 'composite',
  tier: 'A',
  summary: 'The questions the audience is likely to ask, as notes on a wall.',
  keywords: ["q&a", "questions", "faq", "discussion", "closing"],
  category: 'closing',
  scope: 'slide',
  shortDescription: 'Anticipated questions as notes for the Q&A',
  related: ["tls.c.one-question", "tls.c.sticky-board", "tls.t.qa"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [960, 600] },
  describe: {
    when: 'Open the Q&A with the questions people usually ask.',
    avoid: 'Questions with their answers: tls.t.qa.',
    example: { id: 'b_question_wall', type: 'tls.c.question-wall', props: { title: 'Questions you may have', questions: ['Does it need new staff?', 'What did it cost?', 'How long did it run?'] } },
  },
  motion: {
    parts: ["title", "question"],
    preset: 'fade-up',
    partMotion: {
      'title': { preset: 'fade-up', delay: 0, stagger: 60 },
      'question': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildQuestionWall,
})

export const tlsCQuestionWall: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: QuestionWallProps, ctx: LayoutContext): LayoutNode => layoutQuestionWall(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: QuestionWallProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
