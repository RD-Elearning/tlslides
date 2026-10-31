/**
 * tls.c.one-question — spro creative CR8 (PLAN Appendix C.1): a closing or Q&A poster with one
 * giant question. `centered` sets the question at display size in one centred column;
 * `with-motif` puts a decoration beside it (65/35); `margin` sets it low-left beside a giant
 * question mark. Layout: `../_poster.ts` (measured stacks, centred, growing past a short box).
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell } from '../_poster'

export interface OneQuestionProps extends Record<string, unknown> {
  kicker?: string
  question: string | RichText
  prompt?: string
  motif?: string
  variant?: 'centered' | 'with-motif' | 'margin'
}

const VARIANTS = ['centered', 'with-motif', 'margin'] as const
const MOTIFS = ['none', 'blob', 'ring', 'squiggle', 'star', 'sparkle', 'dots', 'orb', 'bulb'] as const

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker', guidance: '"Before you go", "One question".' },
  question: { type: { kind: 'richText', maxChars: 120 }, role: 'content', label: 'Question', required: true, guidance: 'One question the audience leaves with.' },
  prompt: { type: { kind: 'text', maxChars: 100 }, role: 'content', label: 'Prompt', guidance: 'What to think about or discuss.' },
  motif: enumSlot([...MOTIFS], 'Motif', 'A decoration beside the question (with-motif).'),
  variant: enumSlot([...VARIANTS], 'Variant', 'with-motif: a decoration beside; margin: low-left over a giant question mark.'),
}

export const defaults: OneQuestionProps = {
  kicker: 'Before you go',
  question: 'Which of your decisions this week could data have changed?',
  prompt: 'Think of one, and bring it to next session.',
  motif: 'bulb',
  variant: 'centered',
}

function cells(props: OneQuestionProps): { main: Cell[]; side?: Cell[]; align: 'start' | 'center' } {
  const v = pick(props.variant, VARIANTS, 'centered')
  const align = v === 'centered' ? 'center' : 'start'
  const main: Cell[] = []
  if (props.kicker) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: props.kicker } }, align })
  main.push({ spec: { id: 'question', type: 'tls.t.statement', props: { text: props.question, size: 'display', align, showMark: false } }, align })
  if (props.prompt) main.push({ spec: { id: 'prompt', type: 'tls.t.body', props: { text: props.prompt, size: 'lead', align } }, align, space: 0.5 })
  if (v === 'with-motif') {
    const shape = pick(props.motif, MOTIFS, 'bulb')
    const side = shape === 'none' ? undefined : [{ spec: { id: 'motif', type: 'tls.m.decoration', props: { shape, tone: 'accent', opacity: 'medium' } } as BlockSpec, align: 'center' as const }]
    return { main, side, align }
  }
  if (v === 'margin') {
    return { main, side: [{ spec: { id: 'motif', type: 'tls.t.marker', props: { value: '?', variant: 'numeral', tone: 'soft', size: 'lg', align: 'center' } }, align: 'center' }], align }
  }
  return { main, align }
}

export function buildOneQuestion(props: OneQuestionProps): BlockSpec {
  const c = cells(props)
  return posterBuild('one-question', c.main, c.side)
}

export function layoutOneQuestion(props: OneQuestionProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  const v = pick(props.variant, VARIANTS, 'centered')
  return posterLayout(ctx, c.main, { side: c.side, ratio: v === 'margin' ? 0.7 : 0.65, sideFirst: v === 'margin', valign: v === 'margin' ? 'end' : 'center', maxWidth: 1400 })
}

const composite = defineCompositeBlock<OneQuestionProps>({
  type: 'tls.c.one-question',
  name: 'One question',
  family: 'composite',
  tier: 'A',
  summary: 'A closing or Q&A poster with one giant question and a prompt.',
  keywords: ['closing', 'question', 'q&a', 'reflection', 'discussion', 'poster', 'end slide'],
  category: 'closing',
  scope: 'slide',
  shortDescription: 'Closing or Q&A slide with one giant question',
  related: ['tls.c.cta', 'tls.c.callback', 'tls.t.statement'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'Leave the audience with one question to think about, or open the Q&A.',
    avoid: 'Several questions: tls.c.question-wall. A thank-you with contacts: tls.c.closing.',
    example: { id: 'b_one_question', type: 'tls.c.one-question', props: { kicker: 'Before you go', question: 'What would you measure first?', prompt: 'Discuss in pairs for two minutes.' } },
  },
  motion: {
    parts: ['kicker', 'question', 'prompt', 'motif'],
    preset: 'fade-up',
    partMotion: {
      motif: { preset: 'sweep-nodes', delay: 0, stagger: 0 },
      kicker: { preset: 'fade-up', delay: 0, stagger: 0 },
      question: { preset: 'fade-up', delay: 150, stagger: 80 },
      prompt: { preset: 'fade-up', delay: 500, stagger: 0 },
    },
  },
  build: buildOneQuestion,
})

export const tlsCOneQuestion: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: OneQuestionProps, ctx: LayoutContext): LayoutNode => layoutOneQuestion(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: OneQuestionProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
