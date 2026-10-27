/**
 * tls.g.bridge — spro creative CR13 (PLAN Appendix C.3): From where we are to where we want to be, over the gap.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

type Bank = { title: string; text?: string }
export interface BridgeProps extends Record<string, unknown> {
  from: Bank
  to: Bank
  planks: string[]
  variant?: 'arch' | 'flat'
}
const VARIANTS = ['arch', 'flat'] as const
const bank = (label: string) => ({ type: { kind: 'object' as const, fields: {
  title: { type: { kind: 'text' as const, maxChars: 24 }, role: 'content' as const, label: 'Title', required: true },
  text: { type: { kind: 'text' as const, maxChars: 80 }, role: 'content' as const, label: 'Text' },
} }, role: 'content' as const, label, required: true })

export const schema: BlockSchema = {
  from: bank('From'),
  to: bank('To'),
  planks: { type: { kind: 'list', of: { kind: 'text', maxChars: 32 }, min: 1, max: 5 }, role: 'content', label: 'Steps over the gap', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: BridgeProps = { from: { title: 'Today', text: 'Paper triage, four-hour waits' }, to: { title: 'Target', text: 'Digital triage, one-hour waits' }, planks: ['Tablet triage', 'Live bed board', 'Two more night nurses'], variant: 'arch' }

function cells(props: BridgeProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'arch')
  const banks = [props.from, props.to].map((b) => (b && typeof b === 'object' ? (b as Partial<Bank>) : {}))
  const card = (b: Partial<Bank>, i: number): BlockSpec => ({ id: `bank-${i}`, type: 'tls.l.card', props: { padding: 'md', children: [
    { id: `bank-title-${i}`, type: 'tls.t.title', props: { text: str(b.title, 24) || '—', size: 'subheading' } },
    ...(str(b.text, 80) ? [{ id: `bank-text-${i}`, type: 'tls.t.body', props: { text: str(b.text, 80) } }] : []),
  ], $block: { style: { surface: i ? 'accent' : 'surfaceAlt' } } } })
  const planks = strings(props.planks, 5)
  const steps: BlockSpec = planks.length > 1
    ? { id: 'planks', type: 'tls.t.numbered', props: { items: planks, markerStyle: 'badge', spacing: v === 'arch' ? 'roomy' : 'default' } }
    : { id: 'planks', type: 'tls.t.body', props: { text: planks[0] ?? '', size: 'lead', align: 'center' } }
  const items = [card(banks[0], 0), steps, card(banks[1], 1)]
  return { main: [{ spec: { id: 'bridge', type: 'tls.l.grid', props: { columns: 3, gap: 'lg', sizing: 'equal', children: items } }, grid: { columns: 3, items } }], opts: {} }
}

export function buildBridge(props: BridgeProps): BlockSpec {
  const c = cells(props)
  return posterBuild('bridge', c.main, c.opts.side)
}

export function layoutBridge(props: BridgeProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<BridgeProps>({
  type: 'tls.g.bridge',
  name: "Bridge",
  family: 'composite',
  tier: 'A',
  summary: "From where we are to where we want to be, over the gap.",
  keywords: ["bridge", "gap", "from", "to", "current", "target", "transition", "change"],
  category: 'process',
  scope: 'slide',
  shortDescription: "Current state to target across planks",
  related: ["tls.g.before-after", "tls.g.chevrons", "tls.c.journey"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "A move from a current state to a target, with the steps that close the gap.",
    avoid: "Only the two states: tls.g.before-after.",
    example: {"id": "b_bridge", "type": "tls.g.bridge", "props": {"from": {"title": "Today", "text": "Paper triage, four-hour waits"}, "to": {"title": "Target", "text": "Digital triage, one hour"}, "planks": ["Tablet triage", "Live bed board", "Night shift +2"]}},
  },
  motion: {
    parts: ["bridge"],
    preset: 'fade-up',
    partMotion: {
      'bridge': { preset: 'fade-up', delay: 0, stagger: 60 },
    },
  },
  build: buildBridge,
})

export const tlsGBridge: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: BridgeProps, ctx: LayoutContext): LayoutNode => layoutBridge(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: BridgeProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
