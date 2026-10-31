/**
 * tls.c.cta — spro creative CR8 (PLAN Appendix C.1): a closing with one action, a button or a ticket stub carrying the deadline, or a hand arrow.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface CtaProps extends Record<string, unknown> {
  kicker?: string
  action: string
  detail?: string
  deadline?: string
  link?: string
  variant?: 'button' | 'ticket' | 'hand-arrow'
}
const VARIANTS = ['button', 'ticket', 'hand-arrow'] as const

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  action: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Action', required: true, guidance: 'Verb first: "Try the checklist on one ward this month".' },
  detail: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Detail' },
  deadline: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Deadline', guidance: 'Only from the document or the brief.' },
  link: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Link', guidance: 'Only from the document or the brief.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'ticket: a stub with the deadline; hand-arrow: a drawn arrow points at the action.'),
}

export const defaults: CtaProps = { kicker: 'Your next step', action: 'Run the checklist on one ward this month', detail: 'Share what changed at the next review.', deadline: 'By 30 November', variant: 'button' }

function cells(props: CtaProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'button')
  const main: Cell[] = []
  if (props.kicker) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: props.kicker } } })
  main.push({ spec: { id: 'action', type: 'tls.t.statement', props: { text: props.action, size: 'xl', showMark: false } } })
  if (props.detail) main.push({ spec: { id: 'detail', type: 'tls.t.body', props: { text: props.detail, size: 'lead' } } })
  const label = [props.link, v === 'ticket' ? '' : props.deadline].filter(Boolean).join(' · ')
  if (v !== 'ticket' && label) main.push({ spec: { id: 'button', type: 'tls.t.badge', props: { text: label, tone: 'solid', size: 'lg' } }, space: 0.5 })
  if (v === 'ticket' && props.deadline) {
    const stub: BlockSpec = { id: 'ticket', type: 'tls.l.card', props: { padding: 'lg', children: [{ id: 'ticket-text', type: 'tls.t.statement', props: { text: props.deadline, size: 'md', align: 'center', showMark: false } }], $block: { style: { surface: 'accent' } } } }
    return { main, opts: { side: [{ spec: stub, align: 'center' }], ratio: 0.66 } }
  }
  if (v === 'hand-arrow') return { main, opts: { side: [{ spec: { id: 'arrow', type: 'tls.m.decoration', props: { shape: 'squiggle', tone: 'accent', opacity: 'strong' } }, align: 'center' }], ratio: 0.72, sideFirst: true } }
  return { main, opts: { maxWidth: 1400 } }
}

export function buildCta(props: CtaProps): BlockSpec {
  const c = cells(props)
  return posterBuild('cta', c.main, c.opts.side)
}

export function layoutCta(props: CtaProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<CtaProps>({
  type: 'tls.c.cta',
  name: 'Call to action',
  family: 'composite',
  tier: 'A',
  summary: 'A closing with one action: a verb-first line, its detail and a button or ticket.',
  keywords: ["closing", "call to action", "next step", "action", "cta", "do this"],
  category: 'closing',
  scope: 'slide',
  shortDescription: 'Closing with one call to action and its deadline',
  related: ["tls.c.closing", "tls.c.one-question", "tls.c.homework"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [960, 600] },
  describe: {
    when: 'End on one thing the audience should do next.',
    avoid: 'Several actions in order: tls.c.steps. Contacts: tls.c.contact.',
    example: { id: 'b_cta', type: 'tls.c.cta', props: { kicker: 'Your next step', action: 'Try the checklist on one ward', detail: 'Share what changed at the next review.', deadline: 'By 30 November' } },
  },
  motion: {
    parts: ["kicker", "action", "detail", "button", "ticket", "arrow"],
    preset: 'fade-up',
    partMotion: {
      'kicker': { preset: 'fade-up', delay: 0, stagger: 60 },
      'action': { preset: 'fade-up', delay: 150, stagger: 60 },
      'detail': { preset: 'fade-up', delay: 300, stagger: 60 },
      'button': { preset: 'fade-up', delay: 450, stagger: 60 },
      'ticket': { preset: 'fade-up', delay: 600, stagger: 60 },
      'arrow': { preset: 'fade-up', delay: 750, stagger: 60 },
    },
  },
  build: buildCta,
})

export const tlsCCta: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: CtaProps, ctx: LayoutContext): LayoutNode => layoutCta(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: CtaProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
