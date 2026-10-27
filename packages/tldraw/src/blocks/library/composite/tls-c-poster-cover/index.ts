/**
 * tls.c.poster-cover — spro creative CR8 (PLAN Appendix C.1): a typographic poster cover: the title at display scale over up to three lines.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface PosterCoverProps extends Record<string, unknown> {
  kicker?: string
  title: string
  subtitle?: string
  meta?: string
  motif?: string
  variant?: 'stacked' | 'offset' | 'overlap-motif' | 'outline-type'
}
const VARIANTS = ['stacked', 'offset', 'overlap-motif', 'outline-type'] as const
const MOTIFS = ['blob', 'ring', 'squiggle', 'star', 'sparkle', 'orb', 'dots', 'wave'] as const

export const schema: BlockSchema = {
  kicker: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Kicker' },
  title: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Title', required: true },
  subtitle: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Subtitle' },
  meta: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Meta', guidance: 'Presenter, date.' },
  motif: enumSlot([...MOTIFS], 'Motif', 'overlap-motif: drawn beside the title.'),
  variant: enumSlot([...VARIANTS], 'Variant', 'offset: lines indented in steps; overlap-motif: a motif beside; outline-type: follows the look stroke.'),
}

export const defaults: PosterCoverProps = { kicker: 'Lecture 5', title: 'Machine learning, from data to decisions', subtitle: 'What a model learns, and how to tell if it learned it', meta: 'Dr. Lan Tran · October 2026', motif: 'blob', variant: 'stacked' }

function cells(props: PosterCoverProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'stacked')
  const main: Cell[] = []
  if (props.kicker) main.push({ spec: { id: 'kicker', type: 'tls.t.kicker', props: { text: props.kicker } } })
  // display for a short title; a long one at title size, so it stays within three lines
  const big = String(props.title ?? '').length <= 32
  main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: props.title, size: big ? 'display' : 'title' } }, share: v === 'offset' ? 0.88 : 1 })
  if (props.subtitle) main.push({ spec: { id: 'subtitle', type: 'tls.t.subtitle', props: { text: props.subtitle } }, share: v === 'offset' ? 0.7 : 1, align: v === 'offset' ? 'end' : 'start' })
  if (props.meta) main.push({ spec: { id: 'meta', type: 'tls.t.caption', props: { text: props.meta } }, space: 1, share: v === 'offset' ? 0.7 : 1, align: v === 'offset' ? 'end' : 'start' })
  if (v === 'overlap-motif') return { main, opts: { side: [{ spec: { id: 'motif', type: 'tls.m.decoration', props: { shape: pick(props.motif, MOTIFS, 'blob'), tone: 'accent', opacity: 'medium' } }, align: 'center' }], ratio: 0.72 } }
  return { main, opts: {} }
}

export function buildPosterCover(props: PosterCoverProps): BlockSpec {
  const c = cells(props)
  return posterBuild('poster_cover', c.main, c.opts.side)
}

export function layoutPosterCover(props: PosterCoverProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<PosterCoverProps>({
  type: 'tls.c.poster-cover',
  name: 'Poster cover',
  family: 'composite',
  tier: 'A',
  summary: 'A typographic poster cover: a display title, subtitle and meta.',
  keywords: ["cover", "title", "poster", "typographic", "opening"],
  category: 'cover',
  scope: 'slide',
  shortDescription: 'Typographic cover with a display title',
  related: ["tls.c.cover", "tls.c.hero", "tls.c.split-cover"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [1280, 720] },
  describe: {
    when: 'Open the deck with its title set large, no picture needed.',
    avoid: 'A cover with a photo: tls.c.cover or tls.c.split-cover.',
    example: { id: 'b_poster_cover', type: 'tls.c.poster-cover', props: { kicker: 'Lecture 5', title: 'Machine learning, from data to decisions', meta: 'October 2026' } },
  },
  motion: {
    parts: ["kicker", "title", "subtitle", "meta", "motif"],
    preset: 'fade-up',
    partMotion: {
      'kicker': { preset: 'fade-up', delay: 0, stagger: 60 },
      'title': { preset: 'fade-up', delay: 150, stagger: 60 },
      'subtitle': { preset: 'fade-up', delay: 300, stagger: 60 },
      'meta': { preset: 'fade-up', delay: 450, stagger: 60 },
      'motif': { preset: 'fade-up', delay: 600, stagger: 60 },
    },
  },
  build: buildPosterCover,
})

export const tlsCPosterCover: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: PosterCoverProps, ctx: LayoutContext): LayoutNode => layoutPosterCover(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: PosterCoverProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
