/**
 * tls.g.spectrum — spro creative CR13 (PLAN Appendix C.3): Items placed between two poles.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 * First cut: each item is a bar filled to its place between the poles (`tls.d.progress-bar`).
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface SpectrumProps extends Record<string, unknown> {
  left: string
  right: string
  items: Array<{ label: string; at: number; note?: string }>
  variant?: 'line' | 'gradient-bar' | 'slider'
}
const VARIANTS = ['line', 'gradient-bar', 'slider'] as const

export const schema: BlockSchema = {
  left: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Left pole', required: true },
  right: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Right pole', required: true },
  items: { type: { kind: 'list', of: { kind: 'object', fields: {
    label: { type: { kind: 'text', maxChars: 28 }, role: 'content', label: 'Label', required: true },
    at: { type: { kind: 'number', min: 0, max: 1 }, role: 'content', label: 'Place (0 = left, 1 = right)', required: true },
    note: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Note' },
  } }, min: 2, max: 7 }, role: 'content', label: 'Items', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: SpectrumProps = { left: 'Cheap', right: 'Accurate', items: [{ label: 'Rule of thumb', at: 0.15 }, { label: 'Linear model', at: 0.45 }, { label: 'Deep network', at: 0.9 }], variant: 'line' }

function cells(props: SpectrumProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'line')
  const items = objects<{ label?: unknown; at?: unknown; note?: unknown }>(props.items, 7).filter((x) => str(x.label, 28))
  const poles: BlockSpec[] = [
    { id: 'pole-left', type: 'tls.t.kicker', props: { text: str(props.left, 24) || '—' } },
    { id: 'pole-right', type: 'tls.t.kicker', props: { text: str(props.right, 24) || '—' } },
  ]
  const bars = items.map((x) => ({ label: str(x.label, 28), value: Math.round(Math.max(0, Math.min(1, typeof x.at === 'number' ? x.at : 0.5)) * 100), max: 100 }))
  const main: Cell[] = [{ spec: { id: 'poles', type: 'tls.l.grid', props: { columns: 2, gap: 'md', sizing: 'equal', children: poles } }, grid: { columns: 2, items: poles } }]
  if (bars.length) main.push({ spec: { id: 'items', type: 'tls.d.progress-bar', props: { items: bars, showValue: 'none', thickness: v === 'gradient-bar' ? 'lg' : v === 'slider' ? 'md' : 'sm', labelPos: 'left', track: true } }, grow: true })
  return { main, opts: { maxWidth: 1400 } }
}

export function buildSpectrum(props: SpectrumProps): BlockSpec {
  const c = cells(props)
  return posterBuild('spectrum', c.main, c.opts.side)
}

export function layoutSpectrum(props: SpectrumProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<SpectrumProps>({
  type: 'tls.g.spectrum',
  name: "Spectrum",
  family: 'composite',
  tier: 'A',
  summary: "Items placed between two poles.",
  keywords: ["spectrum", "scale", "range", "between", "trade-off", "continuum", "pole"],
  category: 'comparison',
  scope: 'slide',
  shortDescription: "Items placed between two opposite poles",
  related: ["tls.g.balance", "tls.d.progress-bar", "tls.g.matrix-2x2"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "Options that sit somewhere between two extremes.",
    avoid: "Two sides with lists: tls.c.comparison.",
    example: {"id": "b_spectrum", "type": "tls.g.spectrum", "props": {"left": "Cheap", "right": "Accurate", "items": [{"label": "Rule of thumb", "at": 0.15}, {"label": "Linear model", "at": 0.45}, {"label": "Deep network", "at": 0.9}]}},
  },
  motion: {
    parts: ["poles", "items"],
    preset: 'fade-up',
    partMotion: {
      'poles': { preset: 'fade-up', delay: 0, stagger: 60 },
      'items': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildSpectrum,
})

export const tlsGSpectrum: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: SpectrumProps, ctx: LayoutContext): LayoutNode => layoutSpectrum(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: SpectrumProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
