/**
 * tls.g.fishbone — spro creative CR13 (PLAN Appendix C.3): Causes grouped along a spine to one effect.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 * First cut: the branches are cards in a row under the effect (no drawn spine yet).
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface FishboneProps extends Record<string, unknown> {
  effect: string
  branches: Array<{ label: string; causes: string[] }>
  variant?: 'classic' | 'minimal'
}
const VARIANTS = ['classic', 'minimal'] as const

export const schema: BlockSchema = {
  effect: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Effect', required: true },
  branches: { type: { kind: 'list', of: { kind: 'object', fields: {
    label: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Group', required: true },
    causes: { type: { kind: 'list', of: { kind: 'text', maxChars: 40 }, min: 1, max: 4 }, role: 'content', label: 'Causes', required: true },
  } }, min: 2, max: 6 }, role: 'content', label: 'Branches', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: FishboneProps = { effect: 'Long waits in the ER', branches: [{ label: 'People', causes: ['Short night shift', 'Slow handover'] }, { label: 'Process', causes: ['Paper triage', 'Repeated tests'] }, { label: 'Beds', causes: ['Late discharge'] }], variant: 'classic' }

function cells(props: FishboneProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'classic')
  const branches = objects<{ label?: unknown; causes?: unknown }>(props.branches, 6).filter((b) => str(b.label, 24))
  const items: BlockSpec[] = branches.map((b, i) => ({
    id: `branch-${i}`, type: 'tls.l.card',
    props: { padding: 'md', children: [
      { id: `branch-label-${i}`, type: 'tls.t.kicker', props: { text: str(b.label, 24) } },
      { id: `branch-causes-${i}`, type: 'tls.t.bullets', props: { items: strings(b.causes, 4).map((t) => ({ text: t })), marker: 'dash', spacing: 'sm' } },
    ], ...(v === 'classic' ? { $block: { style: { surface: 'surfaceAlt' } } } : {}) },
  }))
  const columns = Math.max(1, Math.min(3, items.length <= 3 ? items.length : Math.ceil(items.length / 2)))
  const main: Cell[] = [{ spec: { id: 'effect', type: 'tls.t.statement', props: { text: str(props.effect, 40), size: 'lg', align: 'center', showMark: false } } }]
  if (items.length) main.push({ spec: { id: 'branches', type: 'tls.l.grid', props: { columns, gap: 'md', sizing: 'equal', children: items } }, group: 'branch', grid: { columns, items } })
  return { main, opts: {} }
}

export function buildFishbone(props: FishboneProps): BlockSpec {
  const c = cells(props)
  return posterBuild('fishbone', c.main, c.opts.side)
}

export function layoutFishbone(props: FishboneProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<FishboneProps>({
  type: 'tls.g.fishbone',
  name: "Fishbone",
  family: 'composite',
  tier: 'A',
  summary: "Causes grouped along a spine to one effect.",
  keywords: ["fishbone", "ishikawa", "cause", "effect", "root cause", "why"],
  category: 'relationship',
  scope: 'slide',
  shortDescription: "Grouped causes leading to one effect",
  related: ["tls.g.breakdown", "tls.g.mindmap", "tls.c.cards"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 540] },
  describe: {
    when: "Many causes, in a few groups, behind one effect or problem.",
    avoid: "One chain of causes: tls.g.flow.",
    example: {"id": "b_fishbone", "type": "tls.g.fishbone", "props": {"effect": "Long waits in the ER", "branches": [{"label": "People", "causes": ["Short night shift", "Slow handover"]}, {"label": "Process", "causes": ["Paper triage"]}, {"label": "Beds", "causes": ["Late discharge"]}]}},
  },
  motion: {
    parts: ["effect", "branch"],
    preset: 'fade-up',
    partMotion: {
      'effect': { preset: 'fade-up', delay: 0, stagger: 60 },
      'branch': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildFishbone,
})

export const tlsGFishbone: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: FishboneProps, ctx: LayoutContext): LayoutNode => layoutFishbone(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: FishboneProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
