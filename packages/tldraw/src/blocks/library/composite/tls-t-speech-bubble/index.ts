/**
 * tls.t.speech-bubble — spro creative CR8 (PLAN Appendix C.1): a speech bubble with a speaker, for scenarios, comics and quotes.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface SpeechBubbleProps extends Record<string, unknown> {
  text: string
  speaker?: string
  variant?: 'round' | 'cloud' | 'shout'
  tail?: 'left' | 'right' | 'down'
}
const VARIANTS = ['round', 'cloud', 'shout'] as const
const TAILS = ['left', 'right', 'down'] as const

export const schema: BlockSchema = {
  text: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Text', required: true },
  speaker: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'Speaker' },
  variant: enumSlot([...VARIANTS], 'Variant'),
  tail: enumSlot([...TAILS], 'Tail'),
}

export const defaults: SpeechBubbleProps = { text: 'Why does the patient wait four hours for a ten-minute visit?', speaker: 'Head nurse', variant: 'round', tail: 'left' }

function cells(props: SpeechBubbleProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'round')
  const kids: BlockSpec[] = [{ id: 'text', type: v === 'shout' ? 'tls.t.statement' : 'tls.t.body', props: v === 'shout' ? { text: props.text, size: 'md', showMark: false } : { text: props.text, size: 'lead' } }]
  if (props.speaker) kids.push({ id: 'speaker', type: 'tls.t.caption', props: { text: props.speaker } })
  return { main: [{ spec: { id: 'bubble', type: 'tls.l.card', props: { padding: 'lg', children: [{ id: 'bubble-stack', type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: kids } }], $block: { style: { surface: v === 'shout' ? 'accent' : 'surfaceAlt' } } } } }], opts: {} }
}

export function buildSpeechBubble(props: SpeechBubbleProps): BlockSpec {
  const c = cells(props)
  return posterBuild('speech_bubble', c.main, c.opts.side)
}

export function layoutSpeechBubble(props: SpeechBubbleProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<SpeechBubbleProps>({
  type: 'tls.t.speech-bubble',
  name: 'Speech bubble',
  family: 'text',
  tier: 'A',
  summary: 'A speech bubble with what someone says and who says it.',
  keywords: ["speech bubble", "dialogue", "scenario", "comic", "voice", "quote"],
  category: 'emphasis',
  scope: 'element',
  shortDescription: 'Speech bubble with a speaker',
  related: ["tls.t.quote", "tls.c.sticky-board", "tls.c.testimonial"],
  schema,
  defaults,
  size: { preferred: [900, 360], min: [320, 160] },
  describe: {
    when: 'Give a voice to a person in a scenario or a story.',
    avoid: 'A formal quote with its source: tls.t.quote.',
    example: { id: 'b_speech_bubble', type: 'tls.t.speech-bubble', props: { text: 'Why do I wait four hours?', speaker: 'A patient' } },
  },
  motion: {
    parts: ["bubble"],
    preset: 'fade-up',
    partMotion: {
      'bubble': { preset: 'fade-up', delay: 0, stagger: 60 },
    },
  },
  build: buildSpeechBubble,
})

export const tlsTSpeechBubble: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: SpeechBubbleProps, ctx: LayoutContext): LayoutNode => layoutSpeechBubble(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: SpeechBubbleProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
