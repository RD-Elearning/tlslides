/**
 * tls.t.drop-cap — spro creative CR13 (PLAN Appendix C.4): A paragraph opened by a large initial.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface DropCapProps extends Record<string, unknown> {
  text: string
  variant?: 'raised' | 'sunk' | 'boxed'
}
const VARIANTS = ['raised', 'sunk', 'boxed'] as const

export const schema: BlockSchema = {
  text: { type: { kind: 'text', maxChars: 400 }, role: 'content', label: 'Paragraph', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: DropCapProps = { text: 'Every winter the ward filled faster than it emptied. The fix was not more beds but knowing, hour by hour, which beds were free.', variant: 'raised' }

function cells(props: DropCapProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'raised')
  const all = str(props.text, 400).trim()
  const initial = Array.from(all)[0] ?? ''
  const rest = all.slice(initial.length)
  const letter: BlockSpec = { id: v === 'boxed' ? 'initial-letter' : 'initial', type: 'tls.t.title', props: { text: initial || ' ', size: 'display', color: 'accent', align: 'center' } }
  const side: Cell[] = [v === 'boxed'
    ? { spec: { id: 'initial', type: 'tls.l.card', props: { padding: 'sm', children: [letter], $block: { style: { surface: 'surfaceAlt' } } } }, align: 'start' }
    : { spec: letter, align: v === 'sunk' ? 'start' : 'center' }]
  return { main: [{ spec: { id: 'text', type: 'tls.t.body', props: { text: rest || all, size: 'lead' } } }], opts: { side, ratio: 0.82, sideFirst: true, valign: 'start' } }
}

export function buildDropCap(props: DropCapProps): BlockSpec {
  const c = cells(props)
  return posterBuild('drop_cap', c.main, c.opts.side)
}

export function layoutDropCap(props: DropCapProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<DropCapProps>({
  type: 'tls.t.drop-cap',
  name: "Drop cap",
  family: 'composite',
  tier: 'A',
  summary: "A paragraph opened by a large initial.",
  keywords: ["drop cap", "initial", "paragraph", "editorial", "story"],
  category: 'text',
  scope: 'element',
  shortDescription: "Paragraph with a large initial letter",
  related: ["tls.t.body", "tls.c.magazine"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "One paragraph that should read like the opening of a story.",
    avoid: "Several short points: tls.t.bullets.",
    example: {"id": "b_drop_cap", "type": "tls.t.drop-cap", "props": {"text": "Every winter the ward filled faster than it emptied. The fix was not more beds but knowing, hour by hour, which beds were free."}},
  },
  motion: {
    parts: ["initial", "text"],
    preset: 'fade-up',
    partMotion: {
      'initial': { preset: 'fade-up', delay: 0, stagger: 60 },
      'text': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildDropCap,
})

export const tlsTDropCap: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: DropCapProps, ctx: LayoutContext): LayoutNode => layoutDropCap(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: DropCapProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
