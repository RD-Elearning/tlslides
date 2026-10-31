/**
 * tls.g.annotated — spro creative CR8 (PLAN Appendix C.1): a figure (an image or a large icon) with numbered notes beside it.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface AnnotatedProps extends Record<string, unknown> {
  image?: string
  icon?: string
  alt?: string
  callouts: Array<{ label: string; note?: string }>
  variant?: 'numbers' | 'labels'
}
const VARIANTS = ['numbers', 'labels'] as const

export const schema: BlockSchema = {
  image: { type: { kind: 'image' }, role: 'content', label: 'Image' },
  icon: { type: { kind: 'icon' }, role: 'option', label: 'Icon', help: 'Drawn large when there is no image.' },
  alt: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Alt text' },
  callouts: { type: { kind: 'list', of: { kind: 'object', fields: { label: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'Label', required: true }, note: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Note' } } }, min: 2, max: 6 }, role: 'content', label: 'Callouts', required: true, guidance: 'Parts of the figure the passages name.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'numbers: a numbered legend; labels: the labels in bold.'),
}

export const defaults: AnnotatedProps = { icon: 'gear', alt: 'The parts of the pump', callouts: [{ label: 'Inlet', note: 'Water enters here' }, { label: 'Impeller', note: 'Spins and pushes the water' }, { label: 'Outlet', note: 'Water leaves under pressure' }], variant: 'numbers' }

function cells(props: AnnotatedProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'numbers')
  const cs = (Array.isArray(props.callouts) ? props.callouts : []).filter((c) => c && typeof c === 'object' && c.label).slice(0, 6)
  const target: BlockSpec = props.image
    ? { id: 'target', type: 'tls.m.image', props: { src: props.image, fit: 'contain', alt: props.alt ?? '' } }
    : { id: 'target', type: 'tls.m.icon', props: { icon: props.icon || 'gear', size: 'xl' } }
  const items = cs.map((c) => (c.note ? (v === 'numbers' ? { runs: [{ text: c.label, bold: true }, { text: ' — ' + c.note }] } : `${c.label} — ${c.note}`) : c.label))
  const legend: BlockSpec = v === 'numbers'
    ? { id: 'legend', type: 'tls.t.numbered', props: { items, markerStyle: 'badge', spacing: 'roomy' } }
    : { id: 'legend', type: 'tls.t.bullets', props: { items: items.map((text) => ({ text })), marker: 'dash' } }
  return { main: [{ spec: legend }], opts: { side: [{ spec: target, align: 'center' }], ratio: 0.5, sideFirst: true } }
}

export function buildAnnotated(props: AnnotatedProps): BlockSpec {
  const c = cells(props)
  return posterBuild('annotated', c.main, c.opts.side)
}

export function layoutAnnotated(props: AnnotatedProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<AnnotatedProps>({
  type: 'tls.g.annotated',
  name: 'Annotated figure',
  family: 'diagram',
  tier: 'A',
  summary: 'A figure with numbered notes naming its parts.',
  keywords: ["annotated", "figure", "diagram", "parts", "callouts", "labels"],
  category: 'media',
  scope: 'slide',
  shortDescription: 'Figure with numbered notes on its parts',
  related: ["tls.c.image-text", "tls.m.image", "tls.t.numbered"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'Explain the parts of one figure or object.',
    avoid: 'A photo with a caption only: tls.c.image-text.',
    example: { id: 'b_annotated', type: 'tls.g.annotated', props: { icon: 'gear', callouts: [{ label: 'Inlet', note: 'Water enters' }, { label: 'Outlet', note: 'Water leaves' }] } },
  },
  motion: {
    parts: ["target", "legend"],
    preset: 'fade-up',
    partMotion: {
      'target': { preset: 'fade-up', delay: 0, stagger: 60 },
      'legend': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildAnnotated,
})

export const tlsGAnnotated: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: AnnotatedProps, ctx: LayoutContext): LayoutNode => layoutAnnotated(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: AnnotatedProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
