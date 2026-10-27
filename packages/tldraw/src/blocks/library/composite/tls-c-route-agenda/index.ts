/**
 * tls.c.route-agenda — spro creative CR8 (PLAN Appendix C.1): the agenda as a route with stops (a road of steps, a metro line, stepping stones or a river).
 * Layout: `../_poster.ts` (measured stacks centred in the block, a side column when the variant
 * has one, growing past a too-short box); `build()` is the same cells as a stack/row tree.
 */
import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { pick, strings, richItems } from '../_kit'
import { posterBuild, posterLayout, schemaCapacity, type Cell, type PosterOptions } from '../_poster'

export interface RouteAgendaProps extends Record<string, unknown> {
  title?: string
  stops: Array<{ label: string; note?: string }>
  current?: number
  variant?: 'road' | 'metro' | 'stepping-stones' | 'river'
}
const VARIANTS = ['road', 'metro', 'stepping-stones', 'river'] as const

export const schema: BlockSchema = {
  title: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Title' },
  stops: { type: { kind: 'list', of: { kind: 'object', fields: { label: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'Stop', required: true }, note: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Note' } } }, min: 3, max: 7 }, role: 'content', label: 'Stops', required: true, guidance: 'The parts of the deck, in order.' },
  current: { type: { kind: 'number', min: 0, max: 6 }, role: 'option', label: 'You are here', help: 'Index of the current stop (on a divider).' },
  variant: enumSlot([...VARIANTS], 'Variant'),
}

export const defaults: RouteAgendaProps = { title: 'Our route today', stops: [{ label: 'Why it matters', note: 'The cost of waiting' }, { label: 'What we measured', note: 'Six months of data' }, { label: 'What we changed', note: 'Three small tests' }, { label: 'What it did', note: 'Results and next steps' }], variant: 'road' }

function cells(props: RouteAgendaProps): { main: Cell[]; opts: PosterOptions } {
  const v = pick(props.variant, VARIANTS, 'road')
  const stops = (Array.isArray(props.stops) ? props.stops : []).filter((s) => s && typeof s === 'object' && s.label).slice(0, 7)
  const main: Cell[] = []
  if (props.title) main.push({ spec: { id: 'title', type: 'tls.t.title', props: { text: props.title, size: 'heading' } } })
  const cur = typeof props.current === 'number' ? props.current : undefined
  const route: BlockSpec = v === 'metro'
    ? { id: 'route', type: 'tls.g.timeline', props: { events: stops.map((s, i) => ({ date: String(i + 1), title: s.label, text: s.note ?? '' })), nodeStyle: 'number' } }
    : v === 'stepping-stones'
      ? { id: 'route', type: 'tls.g.chevrons', props: { steps: stops.map((s) => ({ label: s.label, text: s.note ?? '' })), ...(cur !== undefined ? { currentIndex: cur } : {}) } }
      : { id: 'route', type: 'tls.g.steps', props: { steps: stops.map((s) => ({ title: s.label, description: s.note ?? '' })), direction: 'horizontal', connector: v === 'river' ? 'line' : 'arrow' } }
  main.push({ spec: route, space: 0.5, grow: true })
  return { main, opts: {} }
}

export function buildRouteAgenda(props: RouteAgendaProps): BlockSpec {
  const c = cells(props)
  return posterBuild('route_agenda', c.main, c.opts.side)
}

export function layoutRouteAgenda(props: RouteAgendaProps, ctx: LayoutContext): LayoutNode {
  const c = cells(props)
  return posterLayout(ctx, c.main, c.opts)
}

const composite = defineCompositeBlock<RouteAgendaProps>({
  type: 'tls.c.route-agenda',
  name: 'Route agenda',
  family: 'composite',
  tier: 'A',
  summary: 'The agenda drawn as a route with three to seven stops.',
  keywords: ["agenda", "route", "roadmap", "outline", "journey", "stops"],
  category: 'agenda',
  scope: 'slide',
  shortDescription: 'Agenda as a route with stops',
  related: ["tls.c.agenda", "tls.g.timeline", "tls.c.chapter-divider"],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [640, 360] },
  describe: {
    when: 'Show the parts of the deck as a route the audience travels.',
    avoid: 'A plain numbered list: tls.c.agenda.',
    example: { id: 'b_route_agenda', type: 'tls.c.route-agenda', props: { title: 'Our route', stops: [{ label: 'Why' }, { label: 'What we measured' }, { label: 'What we changed' }] } },
  },
  motion: {
    parts: ["title", "route"],
    preset: 'fade-up',
    partMotion: {
      'title': { preset: 'fade-up', delay: 0, stagger: 60 },
      'route': { preset: 'fade-up', delay: 150, stagger: 60 },
    },
  },
  build: buildRouteAgenda,
})

export const tlsCRouteAgenda: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: RouteAgendaProps, ctx: LayoutContext): LayoutNode => layoutRouteAgenda(props, ctx)) as BlockDefinition['layout'],
  capacity: ((props: RouteAgendaProps) => schemaCapacity(schema, props)) as BlockDefinition['capacity'],
}
