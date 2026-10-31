/**
 * tls.d.annotated-line — spro creative CR13 (PLAN Appendix C.3): a line chart with the events that
 * explain it. First cut: the `tls.d.line` engine takes the leftover height and the events are
 * numbered notes under it (the event's x label leads each note); drawn leaders to the x positions
 * come later. Layout: `../_poster.ts`; `build()` is the same cells as a stack tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { objects, text as str } from '../_wave2'
import { pick, strings } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface AnnotatedLineProps extends Record<string, unknown> {
  categories: string[]
  series: Array<{ name: string; values: Array<number | null> }>
  events: Array<{ x: string; label: string }>
  variant?: 'notes-below' | 'notes-inline'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}
const VARIANTS = ['notes-below', 'notes-inline'] as const

export const schema: BlockSchema = {
  categories: { type: { kind: 'list', of: { kind: 'text', maxChars: 16 }, min: 2, max: 24 }, role: 'content', label: 'Categories', required: true, guidance: 'Ordered x labels.' },
  series: { type: { kind: 'list', of: { kind: 'object', fields: {
    name: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'Name', required: true },
    values: { type: { kind: 'list', of: { kind: 'number' }, min: 2, max: 24 }, role: 'content', label: 'Values', required: true },
  } }, min: 1, max: 2 }, role: 'content', label: 'Series', required: true, guidance: 'One or two lines; a value per category.' },
  events: { type: { kind: 'list', of: { kind: 'object', fields: {
    x: { type: { kind: 'text', maxChars: 16 }, role: 'content', label: 'Where', required: true, guidance: 'One of the categories.' },
    label: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Event', required: true },
  } }, min: 1, max: 4 }, role: 'content', label: 'Events', required: true, guidance: 'What happened at that x, from the source.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'notes-below: a row of notes under the chart; notes-inline: a list beside it.'),
  format: enumSlot(['plain', 'compact', 'percent', 'currency'], 'Number format'),
}

export const defaults: AnnotatedLineProps = {
  categories: ['2019', '2020', '2021', '2022', '2023', '2024'],
  series: [{ name: 'Users (k)', values: [12, 14, 31, 58, 77, 96] }],
  events: [{ x: '2021', label: 'Mobile app launched' }, { x: '2023', label: 'Opened a second city' }],
  variant: 'notes-below',
}

function cells(props: AnnotatedLineProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'notes-below')
  const cats = strings(props.categories, 24)
  const series = objects<{ name?: unknown; values?: unknown }>(props.series, 2).map((s) => ({ name: str(s.name, 32), values: (Array.isArray(s.values) ? s.values : []).map((n) => (typeof n === 'number' && Number.isFinite(n) ? n : null)) }))
  // an event whose x is not a category cannot be placed: it is not shown (the oracle's check, no invented points)
  const events = objects<{ x?: unknown; label?: unknown }>(props.events, 4).filter((e) => cats.includes(str(e.x, 16)) && str(e.label, 40))
  const chart: BlockSpec = { id: 'chart', type: 'tls.d.line', props: { categories: cats, series, markers: 'all', endLabels: series.length > 1, format: props.format ?? 'plain' } }
  // one body block per event, its x in bold (a card per note nested past the depth cap of a build tree)
  const notes: BlockSpec[] = events.map((e, i) => ({ id: `note-${i}`, type: 'tls.t.body', props: { text: { runs: [{ text: str(e.x, 16), bold: true }, { text: ' — ' + str(e.label, 40) }] } } }))
  if (!notes.length) return { main: [{ spec: chart, grow: true }], opts: { gap: 'md' } }
  if (v === 'notes-inline') return { main: [{ spec: chart, grow: true }], opts: { gap: 'md', side: [{ spec: { id: 'notes', type: 'tls.l.grid', props: { columns: 1, gap: 'md', sizing: 'equal', children: notes } }, group: 'note', grid: { columns: 1, items: notes } }], ratio: 0.68 } }
  return { main: [{ spec: chart, grow: true }, { spec: { id: 'notes', type: 'tls.l.grid', props: { columns: notes.length, gap: 'md', sizing: 'equal', children: notes } }, group: 'note', grid: { columns: notes.length, items: notes } }], opts: { gap: 'md', valign: 'start' } }
}

export function buildAnnotatedLine(props: AnnotatedLineProps): BlockSpec {
  const c = cells(props)
  return posterBuild('annotated_line', c.main, c.opts.side)
}

export function layoutAnnotatedLine(props: AnnotatedLineProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

function capacity(props: AnnotatedLineProps): CapacityReport {
  const base = schemaCapacity(schema, props)
  const cats = strings(props.categories, 24)
  const lost = objects<{ x?: unknown }>(props.events, 8).filter((e) => !cats.includes(str(e.x, 16))).length
  return lost ? { ...base, fits: false, remedy: [...base.remedy, { kind: 'truncate', slot: 'events' }] } : base
}

const composite = defineCompositeBlock<AnnotatedLineProps>({
  type: 'tls.d.annotated-line',
  name: 'Annotated line',
  family: 'data',
  tier: 'A',
  summary: 'A line chart with the events that explain it, one note per event.',
  keywords: ['annotated', 'line', 'events', 'timeline', 'trend', 'milestones', 'why it changed'],
  category: 'chart',
  scope: 'slide',
  shortDescription: 'A line chart with a note for each event that moved it',
  related: ['tls.d.line', 'tls.c.chart-insight', 'tls.g.milestones'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 420] },
  describe: {
    when: 'A trend that only makes sense with what happened along it: a launch, a change, a shock.',
    avoid: 'A trend with nothing to explain: tls.d.line. Several series: tls.d.line.',
    example: { id: 'b_annotated_line', type: 'tls.d.annotated-line', props: { categories: ['2021', '2022', '2023', '2024'], series: [{ name: 'Users (k)', values: [31, 58, 77, 96] }], events: [{ x: '2022', label: 'Mobile app launched' }, { x: '2024', label: 'Second city opened' }] } },
  },
  motion: {
    parts: ['chart', 'note'],
    preset: 'fade-up',
    partMotion: {
      chart: { preset: 'fade-up', delay: 0, stagger: 60 },
      note: { preset: 'fade-up', delay: 250, stagger: 120 },
    },
  },
  build: buildAnnotatedLine,
})

export const tlsDAnnotatedLine: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: AnnotatedLineProps, ctx: LayoutContext): LayoutNode => layoutAnnotatedLine(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: AnnotatedLineProps) => capacity(props)) as BlockDefinition['capacity'],
}
