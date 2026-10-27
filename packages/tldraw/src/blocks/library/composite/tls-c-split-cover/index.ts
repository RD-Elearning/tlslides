/**
 * tls.c.split-cover — spro creative CR8 (PLAN Appendix C.1): a colour field on one side carrying a visual (an icon or an image); the title on the other.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface SplitCoverProps extends Record<string, unknown> {
  kicker?: string
  title: string
  subtitle?: string
  meta?: string
  icon?: string
  image?: string
  side?: 'left' | 'right' | 'diagonal'
  tone?: 'accent' | 'accent2' | 'alt'
}
const SIDES = ['left', 'right', 'diagonal'] as const
const TONES = ['accent', 'accent2', 'alt'] as const

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  title: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Title', required: true },
  subtitle: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Subtitle' },
  meta: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Meta' },
  icon: { type: { kind: 'icon' }, role: 'option', label: 'Icon', help: 'Drawn large on the field.' },
  image: { type: { kind: 'image' }, role: 'content', label: 'Image', guidance: 'A source figure, on the field instead of the icon.' },
  side: enumSlot([...SIDES], 'Field side'),
  tone: enumSlot([...TONES], 'Field tone'),
}

export const defaults: SplitCoverProps = { kicker: 'Project report', title: 'Improving patient flow at Riverside', subtitle: 'What we changed and what it did', meta: 'Quality team · Q3 2026', icon: 'chart', side: 'left', tone: 'accent' }

function cells(props: SplitCoverProps): { main: Cell[]; opts: PosterOptions } {
  const side = pick(props.side, SIDES, 'left')
  const tone = pick(props.tone, TONES, 'accent')
  const main: Cell[] = []
  if (props.kicker) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: props.kicker } } })
  main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: props.title, size: 'title' } } })
  if (props.subtitle) main.push({ spec: { id: 'subtitle', type: 'tls.t.subtitle', props: { text: props.subtitle } } })
  if (props.meta) main.push({ spec: { id: 'meta', type: 'tls.t.caption', props: { text: props.meta } }, space: 1 })
  const visual: BlockSpec = props.image
    ? { id: 'visual', type: 'tls.m.image', props: { src: props.image, fit: 'cover', alt: props.title } }
    : { id: 'visual', type: 'tls.m.icon', props: { icon: props.icon || 'star', size: 'xl' } }
  const field: BlockSpec = { id: 'field', type: 'tls.l.card', props: { padding: 'xl', children: [visual], $block: { style: { surface: tone === 'alt' ? 'surfaceAlt' : tone } } } }
  return { main, opts: { side: [{ spec: field, fill: true }], ratio: 0.58, sideFirst: side === 'left' } }
}

export function buildSplitCover(props: SplitCoverProps): BlockSpec {
  const c = cells(props)
  return posterBuild('split_cover', c.main, c.opts.side)
}

export function layoutSplitCover(props: SplitCoverProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<SplitCoverProps>({
  type: 'tls.c.split-cover',
  name: 'Split cover',
  family: 'composite',
  tier: 'A',
  summary: 'A cover split into a colour field with a visual and the title beside it.',
  keywords: ["cover", "title", "split", "colour field", "opening"],
  category: 'cover',
  scope: 'slide',
  shortDescription: 'Cover with a colour field and the title beside it',
  related: ["tls.c.poster-cover", "tls.c.cover", "tls.c.divider"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'Open the deck or a section with a strong colour block and one visual.',
    avoid: 'A title alone: tls.c.poster-cover.',
    example: { id: 'b_split_cover', type: 'tls.c.split-cover', props: { title: 'Improving patient flow at Riverside', subtitle: 'What we changed', icon: 'chart' } },
  },
  motion: {
    parts: ["kicker", "title", "subtitle", "meta", "field", "visual"],
    preset: 'fade-up',
    partMotion: {
      'kicker': { preset: 'fade-up', delay: 0, stagger: 60 },
      'title': { preset: 'fade-up', delay: 150, stagger: 60 },
      'subtitle': { preset: 'fade-up', delay: 300, stagger: 60 },
      'meta': { preset: 'fade-up', delay: 450, stagger: 60 },
      'field': { preset: 'fade-up', delay: 600, stagger: 60 },
      'visual': { preset: 'fade-up', delay: 750, stagger: 60 },
    },
  },
  build: buildSplitCover,
})

export const tlsCSplitCover: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: SplitCoverProps, ctx: LayoutContext): LayoutNode => layoutSplitCover(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: SplitCoverProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
