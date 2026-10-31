/**
 * tls.c.callback — spro creative CR8 (PLAN Appendix C.1): a closing that echoes the cover's title or hook and answers it.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface CallbackProps extends Record<string, unknown> {
  kicker?: string
  echo?: string
  answer: string | RichText
  motif?: string
  variant?: 'mirror' | 'answered'
}
const VARIANTS = ['mirror', 'answered'] as const
const MOTIFS = ['none', 'blob', 'ring', 'squiggle', 'star', 'sparkle', 'orb', 'bulb'] as const

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  echo: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Echo', guidance: "The cover's title or hook, verbatim." },
  answer: { type: { kind: 'richText', maxChars: 140 }, role: 'content', label: 'Answer', required: true, guidance: 'What the deck found: the answer to the cover.' },
  motif: enumSlot([...MOTIFS], 'Motif'),
  variant: enumSlot([...VARIANTS], 'Variant', 'answered: the echo circled, then the answer.'),
}

export const defaults: CallbackProps = { kicker: 'So, back to our question', echo: 'Can a ward cut waiting time without new staff?', answer: 'Yes: by a third, with the same team and a better flow.', motif: 'ring', variant: 'mirror' }

function cells(props: CallbackProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'mirror')
  const main: Cell[] = []
  if (props.kicker) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: props.kicker } } })
  if (props.echo) {
    main.push(v === 'answered'
      ? { spec: { id: 'echo', type: 'tls.t.statement', props: { text: { runs: [{ text: props.echo, bold: true }] }, size: 'md', emphasis: 'circle', showMark: false } } }
      : { spec: { id: 'echo', type: 'tls.t.subtitle', props: { text: props.echo } } })
  }
  main.push({ spec: { id: 'answer', type: 'tls.t.statement', props: { text: props.answer, size: 'xl', showMark: false } }, space: 0.5 })
  const shape = pick(props.motif, MOTIFS, 'ring')
  if (v === 'mirror' && shape !== 'none') return { main, opts: { side: [{ spec: { id: 'motif', type: 'tls.m.decoration', props: { shape, tone: 'accent', opacity: 'medium' } }, align: 'center' }], ratio: 0.68, sideFirst: true } }
  return { main, opts: { maxWidth: 1400 } }
}

export function buildCallback(props: CallbackProps): BlockSpec {
  const c = cells(props)
  return posterBuild('callback', c.main, c.opts.side)
}

export function layoutCallback(props: CallbackProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<CallbackProps>({
  type: 'tls.c.callback',
  name: 'Callback',
  family: 'composite',
  tier: 'A',
  summary: 'A closing that repeats the cover’s question or hook and answers it.',
  keywords: ["closing", "callback", "bookend", "answer", "back to the question"],
  category: 'closing',
  scope: 'slide',
  shortDescription: 'Closing that echoes the cover and answers it',
  related: ["tls.c.one-question", "tls.c.cta", "tls.c.closing"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [960, 680] },
  describe: {
    when: 'The cover asked a question or made a promise: the closing answers it.',
    avoid: 'A new question to think about: tls.c.one-question.',
    example: { id: 'b_callback', type: 'tls.c.callback', props: { echo: 'Can a ward cut waiting time without new staff?', answer: 'Yes: by a third, with the same team.' } },
  },
  motion: {
    parts: ["kicker", "echo", "answer", "motif"],
    preset: 'fade-up',
    partMotion: {
      'kicker': { preset: 'fade-up', delay: 0, stagger: 60 },
      'echo': { preset: 'fade-up', delay: 150, stagger: 60 },
      'answer': { preset: 'fade-up', delay: 300, stagger: 60 },
      'motif': { preset: 'fade-up', delay: 450, stagger: 60 },
    },
  },
  build: buildCallback,
})

export const tlsCCallback: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: CallbackProps, ctx: LayoutContext): LayoutNode => layoutCallback(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: CallbackProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
