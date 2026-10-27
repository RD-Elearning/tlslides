/**
 * tls.c.number-story — spro creative CR13 (PLAN Appendix C.3): Two to four numbers in a sequence that tells a story.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { objects, text as str } from '../_wave2'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface NumberStoryProps extends Record<string, unknown> {
  steps: Array<{ value: string; label: string; note?: string }>
  variant?: 'arrow-row' | 'staircase' | 'zoom'
}
const VARIANTS = ['arrow-row', 'staircase', 'zoom'] as const

export const schema: BlockSchema = {
  steps: { type: { kind: 'list', of: { kind: 'object', fields: {
    value: { type: { kind: 'text', maxChars: 12 }, role: 'content', label: 'Number', required: true, guidance: 'From the source, with its unit.' },
    label: { type: { kind: 'text', maxChars: 48 }, role: 'content', label: 'Label', required: true },
    note: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Note' },
  } }, min: 2, max: 4 }, role: 'content', label: 'Steps', required: true },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: NumberStoryProps = { steps: [{ value: '1,200', label: 'patients a week' }, { value: '4 h', label: 'average wait' }, { value: '1 in 5', label: 'leave before seen', note: 'up from 1 in 10' }], variant: 'arrow-row' }

function cells(props: NumberStoryProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'arrow-row')
  const steps = objects<{ value?: unknown; label?: unknown; note?: unknown }>(props.steps, 4).filter((s) => str(s.value, 12))
  const last = steps.length - 1
  const items: BlockSpec[] = steps.map((s, i) => ({ id: `step-${i}`, type: 'tls.t.hero-number', props: {
    value: str(s.value, 12), unit: str(s.label, 48), ...(str(s.note, 80) ? { caption: str(s.note, 80) } : {}),
    emphasis: v === 'zoom' ? (i === last ? 'accent' : 'muted') : v === 'staircase' && i === last ? 'accent' : i === 0 ? 'accent' : 'default',
  } }))
  const columns = Math.max(1, items.length)
  return { main: items.length ? [{ spec: { id: 'steps', type: 'tls.l.grid', props: { columns, gap: 'lg', sizing: 'equal', children: items } }, group: 'step', grid: { columns, items } }] : [], opts: {} }
}

export function buildNumberStory(props: NumberStoryProps): BlockSpec {
  const c = cells(props)
  return posterBuild('number_story', c.main, c.opts.side)
}

export function layoutNumberStory(props: NumberStoryProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<NumberStoryProps>({
  type: 'tls.c.number-story',
  name: "Number story",
  family: 'composite',
  tier: 'A',
  summary: "Two to four numbers in a sequence that tells a story.",
  keywords: ["numbers", "story", "sequence", "metric", "kpi", "funnel", "from to"],
  category: 'metric',
  scope: 'slide',
  shortDescription: "A few numbers read in sequence",
  related: ["tls.c.kpi-row", "tls.d.stat-compare", "tls.c.big-stat"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 420] },
  describe: {
    when: "A few numbers that only make sense read one after another.",
    avoid: "Independent KPIs: tls.c.kpi-row.",
    example: {"id": "b_number_story", "type": "tls.c.number-story", "props": {"steps": [{"value": "1,200", "label": "patients a week"}, {"value": "4 h", "label": "average wait"}, {"value": "1 in 5", "label": "leave before seen"}]}},
  },
  motion: {
    parts: ["step"],
    preset: 'fade-up',
    partMotion: {
      'step': { preset: 'fade-up', delay: 0, stagger: 60 },
    },
  },
  build: buildNumberStory,
})

export const tlsCNumberStory: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: NumberStoryProps, ctx: LayoutContext): LayoutNode => layoutNumberStory(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: NumberStoryProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
