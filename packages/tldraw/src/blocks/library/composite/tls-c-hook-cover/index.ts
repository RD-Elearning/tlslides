/**
 * tls.c.hook-cover — spro creative CR8 (PLAN Appendix C.1): a cover led by a question or by one number from the document, the title under it.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface HookCoverProps extends Record<string, unknown> {
  kicker?: string
  hook?: string
  number?: string
  numberLabel?: string
  title: string
  meta?: string
  variant?: 'question' | 'number'
}
const VARIANTS = ['question', 'number'] as const

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  hook: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Hook question' },
  number: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Number', guidance: 'Only a number the document gives.' },
  numberLabel: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Number label' },
  title: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Title', required: true },
  meta: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Meta' },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: HookCoverProps = { hook: 'Why do patients wait four hours for a ten-minute visit?', number: '4 h', numberLabel: 'average wait before a ten-minute visit', title: 'Improving patient flow at Riverside', meta: 'Quality team · Q3 2026', variant: 'question' }

function cells(props: HookCoverProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'question')
  const main: Cell[] = []
  if (props.kicker) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: props.kicker } } })
  if (v === 'number' && props.number) main.push({ spec: { id: 'hook', type: 'tls.t.hero-number', props: { value: props.number, caption: props.numberLabel ?? '', emphasis: 'accent' } }, grow: true })
  else if (props.hook) main.push({ spec: { id: 'hook', type: 'tls.t.statement', props: { text: props.hook, size: 'xl', showMark: false } } })
  main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: props.title, size: 'heading' } }, space: 1 })
  if (props.meta) main.push({ spec: { id: 'meta', type: 'tls.t.caption', props: { text: props.meta } } })
  return { main, opts: { maxWidth: 1500 } }
}

export function buildHookCover(props: HookCoverProps): BlockSpec {
  const c = cells(props)
  return posterBuild('hook_cover', c.main, c.opts.side)
}

export function layoutHookCover(props: HookCoverProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<HookCoverProps>({
  type: 'tls.c.hook-cover',
  name: 'Hook cover',
  family: 'composite',
  tier: 'A',
  summary: 'A cover that opens with a question or a striking number, then the title.',
  keywords: ["cover", "hook", "question", "number", "opening"],
  category: 'cover',
  scope: 'slide',
  shortDescription: 'Cover led by a question or a number',
  related: ["tls.c.poster-cover", "tls.c.big-stat", "tls.c.one-question"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [960, 540] },
  describe: {
    when: 'Open with the question the deck answers or the number that makes it matter.',
    avoid: 'A plain title page: tls.c.poster-cover.',
    example: { id: 'b_hook_cover', type: 'tls.c.hook-cover', props: { hook: 'Why do patients wait four hours?', title: 'Improving patient flow' } },
  },
  motion: {
    parts: ["kicker", "hook", "title", "meta"],
    preset: 'fade-up',
    partMotion: {
      'kicker': { preset: 'fade-up', delay: 0, stagger: 60 },
      'hook': { preset: 'fade-up', delay: 150, stagger: 60 },
      'title': { preset: 'fade-up', delay: 300, stagger: 60 },
      'meta': { preset: 'fade-up', delay: 450, stagger: 60 },
    },
  },
  build: buildHookCover,
})

export const tlsCHookCover: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: HookCoverProps, ctx: LayoutContext): LayoutNode => layoutHookCover(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: HookCoverProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
