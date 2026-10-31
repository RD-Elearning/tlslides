/**
 * tls.g.balance — spro creative CR13 (PLAN Appendix C.3): A trade-off on a scale: two sides and which way it tilts.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

type Side = { title: string; items: string[] }
export interface BalanceProps extends Record<string, unknown> {
  left: Side
  right: Side
  tilt?: 'left' | 'right' | 'level'
  variant?: 'scale' | 'seesaw'
}
const VARIANTS = ['scale', 'seesaw'] as const
const side = (label: string) => ({ type: { kind: 'object' as const, fields: {
  title: { type: { kind: 'text' as const, maxChars: 24 }, role: 'content' as const, label: 'Title', required: true },
  items: { type: { kind: 'list' as const, of: { kind: 'text' as const, maxChars: 40 }, min: 1, max: 4 }, role: 'content' as const, label: 'Reasons', required: true },
} }, role: 'content' as const, label, required: true })

export const schema: BlockSchema = {
  left: side('Left'),
  right: side('Right'),
  tilt: enumSlot(['left', 'right', 'level'], 'Heavier side'),
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: BalanceProps = { left: { title: 'Build', items: ['Full control', 'Fits our data'] }, right: { title: 'Buy', items: ['Ready now', 'Support included', 'Lower risk'] }, tilt: 'right', variant: 'scale' }

function cells(props: BalanceProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'scale')
  const tilt = pick(props.tilt, ['left', 'right', 'level'] as const, 'level')
  const sides = [props.left, props.right].map((s) => (s && typeof s === 'object' ? (s as Partial<Side>) : {}))
  const pans: BlockSpec[] = sides.map((s, i) => {
    const heavy = (i === 0 && tilt === 'left') || (i === 1 && tilt === 'right')
    return { id: `pan-${i}`, type: 'tls.l.card', props: { padding: 'md', children: [
      { id: `pan-title-${i}`, type: 'tls.t.title', props: { text: str(s.title, 24) || '—', size: 'subheading', align: 'center' } },
      { id: `pan-items-${i}`, type: 'tls.t.bullets', props: { items: strings(s.items, 4).map((t) => ({ text: t })), marker: 'dot', spacing: 'sm' } },
    ], $block: { style: { surface: heavy ? 'accent' : 'surfaceAlt' } } } }
  })
  const icon = v === 'seesaw' ? 'arrows-left-right' : 'scale'
  const main: Cell[] = [
    { spec: { id: 'beam', type: 'tls.m.icon', props: { icon, size: 'xl', iconStyle: 'disc' } }, align: 'center' },
    { spec: { id: 'pans', type: 'tls.l.grid', props: { columns: 2, gap: 'lg', sizing: 'equal', children: pans } }, group: 'pan', grid: { columns: 2, items: pans } },
  ]
  return { main, opts: { maxWidth: 1400 } }
}

export function buildBalance(props: BalanceProps): BlockSpec {
  const c = cells(props)
  return posterBuild('balance', c.main, c.opts.side)
}

export function layoutBalance(props: BalanceProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<BalanceProps>({
  type: 'tls.g.balance',
  name: "Balance",
  family: 'composite',
  tier: 'A',
  summary: "A trade-off on a scale: two sides and which way it tilts.",
  keywords: ["balance", "scale", "trade-off", "weigh", "seesaw", "pros", "cons"],
  category: 'comparison',
  scope: 'slide',
  shortDescription: "Two sides weighed on a scale",
  related: ["tls.g.pros-cons", "tls.c.comparison", "tls.g.spectrum"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 480] },
  describe: {
    when: "Two sets of reasons weighed against each other, one side winning or level.",
    avoid: "Options with many rows: tls.d.compare-table.",
    example: {"id": "b_balance", "type": "tls.g.balance", "props": {"left": {"title": "Build", "items": ["Full control", "Fits our data"]}, "right": {"title": "Buy", "items": ["Ready now", "Support included"]}, "tilt": "right"}},
  },
  motion: {
    parts: ["beam", "pan"],
    preset: 'fade-up',
    partMotion: {
      'beam': { preset: 'fade-up', delay: 0, stagger: 60 },
      'pan': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildBalance,
})

export const tlsGBalance: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: BalanceProps, ctx: LayoutContext): LayoutNode => layoutBalance(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: BalanceProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
