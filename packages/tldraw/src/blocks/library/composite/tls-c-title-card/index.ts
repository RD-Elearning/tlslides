/**
 * tls.c.title-card — spro creative CR13 (PLAN Appendix C.4): A luxury frame for a title, a section or a quote.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface TitleCardProps extends Record<string, unknown> {
  kicker?: string
  title: string
  line?: string
  variant?: 'double-rule' | 'corner-ornament' | 'arch'
}
const VARIANTS = ['double-rule', 'corner-ornament', 'arch'] as const

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  title: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Title', required: true },
  line: { type: { kind: 'text', maxChars: 100 }, role: 'content', label: 'Line' },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: TitleCardProps = { kicker: 'Chapter two', title: 'Where the beds went', line: 'A year of small changes on ward four', variant: 'double-rule' }

function cells(props: TitleCardProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'double-rule')
  const main: Cell[] = []
  if (str(props.kicker, 40)) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: str(props.kicker, 40), tracking: 'wide' } }, align: 'center' })
  main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: str(props.title, 60) || ' ', size: 'display', align: 'center', rule: v === 'double-rule' } } })
  if (str(props.line, 100)) main.push({ spec: { id: 'line', type: 'tls.t.body', props: { text: str(props.line, 100), size: 'lead', align: 'center' } } })
  const surface = v === 'arch' ? 'accent' : 'surfaceAlt'
  return { main, opts: { maxWidth: 1200, backdrop: { id: 'frame', type: 'tls.l.card', props: { padding: 'xl', children: [], $block: { style: { surface } } } } } }
}

export function buildTitleCard(props: TitleCardProps): BlockSpec {
  const c = cells(props)
  return posterBuild('title_card', c.main, c.opts.side)
}

export function layoutTitleCard(props: TitleCardProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<TitleCardProps>({
  type: 'tls.c.title-card',
  name: "Title card",
  family: 'composite',
  tier: 'A',
  summary: "A luxury frame for a title, a section or a quote.",
  keywords: ["title card", "frame", "elegant", "cover", "section", "ornament"],
  category: 'cover',
  scope: 'slide',
  shortDescription: "Framed title with kicker and line",
  related: ["tls.c.poster-cover", "tls.c.chapter-divider", "tls.c.hero"],
  schema,
  defaults,
  size: { preferred: [1600, 960], min: [640, 960] },
  describe: {
    when: "A cover, a divider or a closing line in an elegant deck.",
    avoid: "A playful cover: tls.c.hook-cover.",
    example: {"id": "b_title_card", "type": "tls.c.title-card", "props": {"kicker": "Chapter two", "title": "Where the beds went", "line": "A year of small changes on ward four"}},
  },
  motion: {
    parts: ["kicker", "title", "line"],
    preset: 'fade-up',
    partMotion: {
      'kicker': { preset: 'fade-up', delay: 0, stagger: 60 },
      'title': { preset: 'fade-up', delay: 150, stagger: 60 },
      'line': { preset: 'fade-up', delay: 300, stagger: 60 },
    },
  },
  build: buildTitleCard,
})

export const tlsCTitleCard: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: TitleCardProps, ctx: LayoutContext): LayoutNode => layoutTitleCard(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: TitleCardProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
