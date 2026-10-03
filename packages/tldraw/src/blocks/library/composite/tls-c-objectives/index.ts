/**
 * tls.c.objectives — learning objectives or goals: an intro line and a numbered, ticked or icon list.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (a stack of `tls.t.subtitle` and one list block:
 * `tls.t.numbered`, `tls.t.checklist` or `tls.m.icon-list`); `layout()` places the same two specs by hand
 * and flattens them (see `../_kit.ts`), vertically centred in the region. The tree is 2 deep.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { capacityOf } from '../../diagram/_kit'
import { composeFlat, measureHeights, pick, strings, type Piece } from '../_kit'

export const OBJ_MIN = 2
export const OBJ_MAX = 6

export interface ObjectivesProps extends Record<string, unknown> {
  intro?: string
  items: string[]
  marker?: 'numbered' | 'check' | 'icon'
  icon?: string
  cols?: '1' | '2'
  showIntro?: boolean
}

export const schema: BlockSchema = {
  intro: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Intro line', guidance: '"By the end of this session you will be able to".' },
  items: { type: { kind: 'list', of: { kind: 'text', maxChars: 120 }, min: OBJ_MIN, max: OBJ_MAX }, role: 'content', label: 'Objectives', required: true, guidance: 'Start each with a verb.' },
  marker: enumSlot(['numbered', 'check', 'icon'], 'Marker'),
  icon: { type: { kind: 'icon' }, role: 'option', label: 'Icon', help: 'For marker icon.' },
  cols: enumSlot(['1', '2'], 'Columns', 'Two columns for numbered and check.'),
  showIntro: { type: { kind: 'boolean' }, role: 'option', label: 'Show intro', toggles: 'intro' },
}

export const defaults: ObjectivesProps = {
  intro: 'By the end of this session you will be able to:',
  items: [
    'Describe a sample with its centre and spread',
    'Choose a chart that fits the question',
    'Explain what a confidence interval does not say',
    'Run a two-sample test on real data',
  ],
  marker: 'numbered',
  icon: 'target',
  cols: '1',
}

const MARKERS = ['numbered', 'check', 'icon'] as const

/** The list block for the chosen marker. */
function listSpec(props: ObjectivesProps): BlockSpec {
  const items = strings(props.items, OBJ_MAX)
  const marker = pick(props.marker, MARKERS, 'numbered')
  const columns = props.cols === '2' ? '2' : '1'
  if (marker === 'check') return { id: 'list', type: 'tls.t.checklist', props: { items: items.map((text) => ({ text, state: 'done' })), doneStyle: 'check', spacing: 'roomy', columns } }
  if (marker === 'icon') {
    return { id: 'list', type: 'tls.m.icon-list', props: { items: items.map((title) => ({ icon: props.icon || 'target', title })), iconStyle: 'circle', iconTone: 'accent', spacing: 'roomy', showText: false } }
  }
  return { id: 'list', type: 'tls.t.numbered', props: { items, markerStyle: 'badge', spacing: 'roomy', columns } }
}

const introSpec = (props: ObjectivesProps): BlockSpec | undefined =>
  isShown(props, 'showIntro') && props.intro ? { id: 'intro', type: 'tls.t.subtitle', props: { text: props.intro } } : undefined

export function buildObjectives(props: ObjectivesProps): BlockSpec {
  const children = [introSpec(props), listSpec(props)].filter(Boolean) as BlockSpec[]
  return { id: 'objectives', type: 'tls.l.stack', props: { gap: 'lg', sizing: 'content', children } }
}

export function layoutObjectives(props: ObjectivesProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const gap = ctx.tokens.space.lg
  const intro = introSpec(props)
  const list = listSpec(props)
  const specs = [intro, list].filter(Boolean) as BlockSpec[]
  const hs = measureHeights(ctx, specs, W)
  const needed = hs.reduce((a, b) => a + b, 0) + gap * Math.max(0, specs.length - 1)
  const total = Math.max(H, needed)
  const pieces: Piece[] = []
  let y = (total - needed) / 2
  specs.forEach((spec, i) => {
    pieces.push({ id: spec.id, spec, box: { x: 0, y, width: W, height: hs[i] } })
    y += hs[i] + gap
  })
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<ObjectivesProps>({
  type: 'tls.c.objectives',
  name: 'Objectives',
  family: 'composite',
  tier: 'A',
  summary: 'Learning objectives or goals as a numbered, checked or icon list with an intro line.',
  keywords: ['objectives', 'learning outcomes', 'goals', 'aims', 'by the end', 'lecture start', 'workshop'],
  category: 'agenda',
  scope: 'slide',
  shortDescription: 'Learning objectives or goals as a numbered or checked list with an intro line',
  related: ['tls.c.agenda', 'tls.t.numbered', 'tls.t.checklist'],
  schema,
  defaults,
  size: { preferred: [1500, 640], min: [560, 320] },
  describe: {
    when: 'Start of a lecture, workshop or project: what the audience will achieve.',
    avoid: 'A list of topics to cover: tls.c.agenda.',
    example: {
      id: 'b_objectives',
      type: 'tls.c.objectives',
      props: {
        intro: 'By the end you will be able to:',
        items: ['Describe a sample', 'Choose a fitting chart', 'Run a two-sample test'],
        marker: 'numbered',
      },
    },
  },
  motion: { parts: ['root'], preset: 'stagger-lines' },
  build: buildObjectives,
})

function capacity(props: ObjectivesProps): CapacityReport {
  const used = Array.isArray(props.items) ? props.items.length : 0
  return capacityOf({ items: { max: OBJ_MAX, used } }, true, [{ kind: 'truncate', slot: 'items' }, { kind: 'paginate' }])
}

export const tlsCObjectives: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: ObjectivesProps, ctx: LayoutContext): LayoutNode => layoutObjectives(props, ctx)) as BlockDefinition['layout'],
  capacity: capacity as BlockDefinition['capacity'],
}
