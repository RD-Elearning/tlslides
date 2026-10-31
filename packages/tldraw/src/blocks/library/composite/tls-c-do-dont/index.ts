/**
 * tls.c.do-dont — spro creative CR13 (PLAN Appendix C.3): What to do and what not to do, side by side.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface DoDontProps extends Record<string, unknown> {
  do: string[]
  dont: string[]
  titles?: string[]
  variant?: 'columns' | 'cards' | 'stamped'
}
const VARIANTS = ['columns', 'cards', 'stamped'] as const

export const schema: BlockSchema = {
  do: { type: { kind: 'list', of: { kind: 'text', maxChars: 60 }, min: 2, max: 5 }, role: 'content', label: 'Do', required: true },
  dont: { type: { kind: 'list', of: { kind: 'text', maxChars: 60 }, min: 2, max: 5 }, role: 'content', label: "Don't", required: true },
  titles: { type: { kind: 'list', of: { kind: 'text', maxChars: 16 }, min: 0, max: 2 }, role: 'content', label: 'Titles (do, don\'t)' },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: DoDontProps = { do: ['Wash hands before each patient', 'Label every sample', 'Ask when unsure'], dont: ['Reuse gloves', 'Guess a dose', 'Skip the handover'], titles: ['Do', "Don't"], variant: 'cards' }

function cells(props: DoDontProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'cards')
  const titles = strings(props.titles, 2)
  const col = (key: 'do' | 'dont', i: number): BlockSpec => {
    const items = strings(props[key], 5)
    const kids: BlockSpec[] = []
    if (v === 'stamped') kids.push({ id: `${key}-mark`, type: 'tls.m.icon', props: { icon: key === 'do' ? 'check' : 'x', size: 'lg', iconStyle: 'disc', color: key === 'do' ? 'positive' : 'negative' } })
    kids.push({ id: `${key}-title`, type: 'tls.t.title', props: { text: titles[i] || (key === 'do' ? 'Do' : "Don't"), size: 'subheading', color: key === 'do' ? 'positive' : 'negative' } })
    if (items.length >= 2) kids.push({ id: `${key}-items`, type: 'tls.t.checklist', props: { items: items.map((t) => ({ text: t, state: key === 'do' ? 'done' : 'blocked' })), doneStyle: 'check' } })
    else if (items.length) kids.push({ id: `${key}-items`, type: 'tls.t.body', props: { text: items[0] } })
    return { id: key, type: 'tls.l.card', props: { padding: v === 'columns' ? 'sm' : 'md', children: kids, $block: { style: { surface: 'surfaceAlt' } } } }
  }
  const items = [col('do', 0), col('dont', 1)]
  return { main: [{ spec: { id: 'sides', type: 'tls.l.grid', props: { columns: 2, gap: 'lg', sizing: 'equal', children: items } }, group: 'side', grid: { columns: 2, items } }], opts: {} }
}

export function buildDoDont(props: DoDontProps): BlockSpec {
  const c = cells(props)
  return posterBuild('do_dont', c.main, c.opts.side)
}

export function layoutDoDont(props: DoDontProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<DoDontProps>({
  type: 'tls.c.do-dont',
  name: "Do and don't",
  family: 'composite',
  tier: 'A',
  summary: "What to do and what not to do, side by side.",
  keywords: ["do", "dont", "don't", "rules", "good practice", "mistakes", "should"],
  category: 'comparison',
  scope: 'slide',
  shortDescription: "Do and don't lists side by side",
  related: ["tls.g.pros-cons", "tls.g.myth-fact", "tls.c.comparison"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: "Practical rules: the right way set against the common mistakes.",
    avoid: "Advantages and drawbacks of one option: tls.g.pros-cons.",
    example: {"id": "b_do_dont", "type": "tls.c.do-dont", "props": {"do": ["Wash hands before each patient", "Label every sample"], "dont": ["Reuse gloves", "Guess a dose"]}},
  },
  motion: {
    parts: ["side"],
    preset: 'fade-up',
    partMotion: {
      'side': { preset: 'fade-up', delay: 0, stagger: 60 },
    },
  },
  build: buildDoDont,
})

export const tlsCDoDont: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: DoDontProps, ctx: LayoutContext): LayoutNode => layoutDoDont(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: DoDontProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
