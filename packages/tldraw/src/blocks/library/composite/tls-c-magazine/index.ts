/**
 * tls.c.magazine — spro creative CR13 (PLAN Appendix C.4): An editorial text column with a kicker, a pull quote beside it and an optional figure.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface MagazineProps extends Record<string, unknown> {
  kicker?: string
  body: string | RichText
  pull?: string
  image?: string
  alt?: string
  variant?: 'two-column' | 'figure-left' | 'figure-right'
}
const VARIANTS = ['two-column', 'figure-left', 'figure-right'] as const

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  body: { type: { kind: 'richText', maxChars: 600 }, role: 'content', label: 'Body', required: true },
  pull: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Pull quote', guidance: 'Verbatim from the body.' },
  image: { type: { kind: 'image' }, role: 'content', label: 'Figure' },
  alt: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Figure description' },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: MagazineProps = { kicker: 'Case study', body: 'The ward cut its waits by half in a year. Nurses triaged on tablets, beds were tracked live, and night shifts grew by two.', pull: 'beds were tracked live', variant: 'two-column' }

function cells(props: MagazineProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'two-column')
  const main: Cell[] = []
  if (str(props.kicker, 40)) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: str(props.kicker, 40), marker: true } } })
  const body = typeof props.body === 'object' && props.body ? props.body : str(props.body, 600)
  main.push({ spec: { id: 'body', type: 'tls.t.body', props: { text: body, size: 'lead' } } })
  const side: Cell[] = []
  const image = str(props.image, 400)
  if (image && v !== 'two-column') side.push({ spec: { id: 'figure', type: 'tls.m.image', props: { src: image, alt: str(props.alt, 160) || 'Figure', fit: 'cover' } }, grow: true })
  if (str(props.pull, 120)) side.push({ spec: { id: 'pull', type: 'tls.t.quote', props: { text: str(props.pull, 120), variant: 'side', markStyle: 'rule' } } })
  return { main, opts: side.length ? { side, ratio: 0.58, sideFirst: v === 'figure-left' } : { maxWidth: 1200 } }
}

export function buildMagazine(props: MagazineProps): BlockSpec {
  const c = cells(props)
  return posterBuild('magazine', c.main, c.opts.side)
}

export function layoutMagazine(props: MagazineProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<MagazineProps>({
  type: 'tls.c.magazine',
  name: "Magazine",
  family: 'composite',
  tier: 'A',
  summary: "An editorial text column with a kicker, a pull quote beside it and an optional figure.",
  keywords: ["magazine", "editorial", "article", "pull quote", "column", "story"],
  category: 'text',
  scope: 'slide',
  shortDescription: "Editorial column with a pull quote",
  related: ["tls.t.pull-quote", "tls.t.drop-cap", "tls.t.quote"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 420] },
  describe: {
    when: "A short passage worth reading as text, with one line pulled out.",
    avoid: "A bare quote: tls.t.pull-quote.",
    example: {"id": "b_magazine", "type": "tls.c.magazine", "props": {"kicker": "Case study", "body": "The ward cut its waits by half in a year. Nurses triaged on tablets, beds were tracked live, and night shifts grew by two.", "pull": "beds were tracked live"}},
  },
  motion: {
    parts: ["kicker", "body", "pull"],
    preset: 'fade-up',
    partMotion: {
      'kicker': { preset: 'fade-up', delay: 0, stagger: 60 },
      'body': { preset: 'fade-up', delay: 150, stagger: 60 },
      'pull': { preset: 'fade-up', delay: 300, stagger: 60 },
    },
  },
  build: buildMagazine,
})

export const tlsCMagazine: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: MagazineProps, ctx: LayoutContext): LayoutNode => layoutMagazine(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: MagazineProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
