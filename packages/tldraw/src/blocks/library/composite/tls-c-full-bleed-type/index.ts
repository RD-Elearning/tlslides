/**
 * tls.c.full-bleed-type — spro creative CR13 (PLAN Appendix C.4): One word or a short phrase filling the slide, the rest small.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface FullBleedTypeProps extends Record<string, unknown> {
  word: string
  line?: string
  kicker?: string
  variant?: 'solid' | 'outline' | 'image-fill'
}
const VARIANTS = ['solid', 'outline', 'image-fill'] as const

export const schema: BlockSchema = {
  word: { type: { kind: 'text', maxChars: 16 }, role: 'content', label: 'Word', required: true },
  line: { type: { kind: 'text', maxChars: 100 }, role: 'content', label: 'Line' },
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: FullBleedTypeProps = { word: 'Wait.', line: 'The average patient waits four hours.', kicker: 'Emergency care', variant: 'solid' }

function cells(props: FullBleedTypeProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'solid')
  const main: Cell[] = []
  if (str(props.kicker, 40)) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: str(props.kicker, 40) } } })
  main.push({ spec: { id: 'word', type: 'tls.t.title', props: { text: str(props.word, 16) || ' ', size: 'fit', color: v === 'outline' ? 'text' : 'accent' } } })
  if (str(props.line, 100)) main.push({ spec: { id: 'line', type: 'tls.t.body', props: { text: str(props.line, 100), size: 'lead' } } })
  return { main, opts: { valign: v === 'image-fill' ? 'end' : 'center' } }
}

export function buildFullBleedType(props: FullBleedTypeProps): BlockSpec {
  const c = cells(props)
  return posterBuild('full_bleed_type', c.main, c.opts.side)
}

export function layoutFullBleedType(props: FullBleedTypeProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<FullBleedTypeProps>({
  type: 'tls.c.full-bleed-type',
  name: "Full-bleed type",
  family: 'composite',
  tier: 'A',
  summary: "One word or a short phrase filling the slide, the rest small.",
  keywords: ["word", "type", "poster", "statement", "big text", "cover"],
  category: 'cover',
  scope: 'slide',
  shortDescription: "One huge word with a small line",
  related: ["tls.c.poster-cover", "tls.t.statement", "tls.c.title-card"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "One word says it all: a cover, a divider, a statement.",
    avoid: "A sentence: tls.t.statement.",
    example: {"id": "b_full_bleed_type", "type": "tls.c.full-bleed-type", "props": {"word": "Wait.", "line": "The average patient waits four hours.", "kicker": "Emergency care"}},
  },
  motion: {
    parts: ["kicker", "word", "line"],
    preset: 'fade-up',
    partMotion: {
      'kicker': { preset: 'fade-up', delay: 0, stagger: 60 },
      'word': { preset: 'fade-up', delay: 150, stagger: 60 },
      'line': { preset: 'fade-up', delay: 300, stagger: 60 },
    },
  },
  build: buildFullBleedType,
})

export const tlsCFullBleedType: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: FullBleedTypeProps, ctx: LayoutContext): LayoutNode => layoutFullBleedType(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: FullBleedTypeProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
