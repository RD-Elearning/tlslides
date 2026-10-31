/**
 * tls.t.pull-quote — spro creative CR13 (PLAN Appendix C.4): A quote set between rules, at display scale.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface PullQuoteProps extends Record<string, unknown> {
  text: string
  source?: string
  variant?: 'rules' | 'marks' | 'side'
}
const VARIANTS = ['rules', 'marks', 'side'] as const

export const schema: BlockSchema = {
  text: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Quote', required: true },
  source: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Source' },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: PullQuoteProps = { text: 'We did not add beds. We learned where they were.', source: 'Head nurse, ward 4', variant: 'rules' }

function cells(props: PullQuoteProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'rules')
  const quote = { id: 'quote', type: 'tls.t.quote', props: {
    text: str(props.text, 160), ...(str(props.source, 60) ? { attribution: str(props.source, 60) } : {}),
    variant: v === 'side' ? 'side' : 'big', markStyle: v === 'rules' ? 'rule' : 'glyph',
  } }
  return { main: [{ spec: quote as BlockSpec }], opts: { maxWidth: 1400 } }
}

export function buildPullQuote(props: PullQuoteProps): BlockSpec {
  const c = cells(props)
  return posterBuild('pull_quote', c.main, c.opts.side)
}

export function layoutPullQuote(props: PullQuoteProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<PullQuoteProps>({
  type: 'tls.t.pull-quote',
  name: "Pull quote",
  family: 'composite',
  tier: 'A',
  summary: "A quote set between rules, at display scale.",
  keywords: ["pull quote", "quote", "editorial", "statement", "citation"],
  category: 'emphasis',
  scope: 'element',
  shortDescription: "A display quote between rules",
  related: ["tls.t.quote", "tls.t.statement", "tls.c.magazine"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "One line from the source that deserves to be read large.",
    avoid: "A quote with a photo of its author: tls.c.testimonial.",
    example: {"id": "b_pull_quote", "type": "tls.t.pull-quote", "props": {"text": "We did not add beds. We learned where they were.", "source": "Head nurse, ward 4"}},
  },
  motion: {
    parts: ["quote"],
    preset: 'fade-up',
    partMotion: {
      'quote': { preset: 'fade-up', delay: 0, stagger: 60 },
    },
  },
  build: buildPullQuote,
})

export const tlsTPullQuote: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: PullQuoteProps, ctx: LayoutContext): LayoutNode => layoutPullQuote(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: PullQuoteProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
