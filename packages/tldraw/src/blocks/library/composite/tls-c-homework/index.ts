/**
 * tls.c.homework — spro creative CR8 (PLAN Appendix C.1): an assignment: the task, what makes it good, the deliverable and when it is due.
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface HomeworkProps extends Record<string, unknown> {
  title?: string
  task: string
  criteria?: string[]
  due?: string
  deliverable?: string
  variant?: 'card' | 'notebook'
}
const VARIANTS = ['card', 'notebook'] as const

export const schema: BlockSchema = {
  title: { type: { kind: 'text', maxChars: 50 }, role: 'content', label: 'Title' },
  task: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Task', required: true },
  criteria: { type: { kind: 'list', of: { kind: 'text', maxChars: 60 }, min: 0, max: 4 }, role: 'content', label: 'Criteria' },
  due: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Due', guidance: 'Only from the document or the brief.' },
  deliverable: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Deliverable' },
  variant: enumSlot([...VARIANTS], 'Variant', 'notebook: no card, ruled like a page.'),
}

export const defaults: HomeworkProps = { title: 'Before next week', task: 'Pick one dataset you use at work and write the question you would ask it.', criteria: ['One clear question', 'The data that answers it', 'One risk of a wrong answer'], deliverable: 'One page', due: 'Monday 9:00', variant: 'card' }

function cells(props: HomeworkProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'card')
  const crit = strings(props.criteria, 4)
  const kids: BlockSpec[] = []
  if (props.title) kids.push({ id: 'title', type: 'tls.t.title', props: { text: props.title, size: 'heading' } })
  kids.push({ id: 'task', type: 'tls.t.body', props: { text: props.task, size: 'lead' } })
  if (crit.length) kids.push({ id: 'criteria', type: 'tls.t.checklist', props: { items: crit.map((text) => ({ text, state: 'open' })), spacing: 'default' } })
  const meta = [props.deliverable, props.due].filter(Boolean).join(' · ')
  if (meta) kids.push({ id: 'meta', type: 'tls.t.badge', props: { text: meta, tone: 'soft', size: 'md' } })
  const main = kids.map((spec) => ({ spec }))
  if (v === 'notebook') return { main, opts: { maxWidth: 1300 } }
  return { main, opts: { maxWidth: 1300, gap: 'md', backdrop: { id: 'card', type: 'tls.l.card', props: { padding: 'md', children: [], $block: { style: { surface: 'surfaceAlt' } } } } } }
}

export function buildHomework(props: HomeworkProps): BlockSpec {
  const c = cells(props)
  return posterBuild('homework', c.main, c.opts.side)
}

export function layoutHomework(props: HomeworkProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<HomeworkProps>({
  type: 'tls.c.homework',
  name: 'Homework',
  family: 'composite',
  tier: 'A',
  summary: 'An assignment card: the task, its criteria, the deliverable and the due date.',
  keywords: ["homework", "assignment", "task", "exercise", "due"],
  category: 'learning',
  scope: 'slide',
  shortDescription: 'Assignment card with task, criteria and due date',
  related: ["tls.c.cta", "tls.t.checklist", "tls.c.objectives"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [960, 600] },
  describe: {
    when: 'End a lesson with the work to do before the next one.',
    avoid: 'One action for an audience: tls.c.cta.',
    example: { id: 'b_homework', type: 'tls.c.homework', props: { title: 'Before next week', task: 'Write the question you would ask your data.', criteria: ['One clear question', 'The data that answers it'] } },
  },
  motion: {
    parts: ["card", "title", "task", "criteria", "meta"],
    preset: 'fade-up',
    partMotion: {
      'card': { preset: 'fade-up', delay: 0, stagger: 60 },
      'title': { preset: 'fade-up', delay: 150, stagger: 60 },
      'task': { preset: 'fade-up', delay: 300, stagger: 60 },
      'criteria': { preset: 'fade-up', delay: 450, stagger: 60 },
      'meta': { preset: 'fade-up', delay: 600, stagger: 60 },
    },
  },
  build: buildHomework,
})

export const tlsCHomework: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: HomeworkProps, ctx: LayoutContext): LayoutNode => layoutHomework(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: HomeworkProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
