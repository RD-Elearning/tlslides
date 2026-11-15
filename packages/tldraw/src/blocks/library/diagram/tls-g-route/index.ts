/**
 * tls.g.route — spro sprint 2026-11c S25 (shape `route`; ha-giang: "Hà Nội → Quản Bạ → Đồng Văn → Mã Pí Lèng" drawn as a
 * list of bullets): a schematic route — named stops on one smooth line across the region, the start a filled mark, the
 * end a ringed one, a short note under each stop and the leg's distance on the line between two stops. Schematic, never
 * a map (README §8): the stops sit evenly on a gentle wave, labels above and below in turn so neighbours never collide.
 * The text type is the largest tier at which every name and note is whole (never in a measuring pass).
 */
import type { BlockDefinition, BlockSchema, CapacityReport, LayoutContext, LayoutNode, MotionRecipe, Size, TypeToken } from '../../../types'
import { capacityOf, emptyState, fitTier, lineH, linesNeeded, mutedStyle, objs, placeLines, readableOn, root, str, strokePath, style, tintOf } from '../_kit'
import { slot } from '../_motion'
import { DEFAULT_PROBE_HEIGHT } from '../../../layout/measure-block'

export const ROUTE_MIN = 2
export const ROUTE_MAX = 8
const PAD = 16
const NAME_LINES = 2
const NOTE_LINES = 2

export interface RouteStop extends Record<string, unknown> {
  name: string
  note?: string
  /** the leg that arrives at this stop (from the previous one): "160 km", "45 min" */
  leg?: string
}
export interface RouteProps extends Record<string, unknown> {
  stops: RouteStop[]
}

export const schema: BlockSchema = {
  stops: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          name: { type: { kind: 'text', maxChars: 32 }, required: true, role: 'content', label: 'Stop' },
          note: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Note', help: 'What happens there, in a few words.' },
          leg: { type: { kind: 'text', maxChars: 16 }, role: 'content', label: 'Leg', help: 'The distance or time from the previous stop: "160 km", "2 h". Empty on the first stop.' },
        },
      },
      min: ROUTE_MIN,
      max: ROUTE_MAX,
    },
    role: 'content',
    label: 'Stops',
    required: true,
    guidance: 'The places in travel order, 3-6; leg = the distance from the previous stop.',
  },
}

export const defaults: RouteProps = {
  stops: [
    { name: 'Hà Nội', note: 'Khởi hành 6:00' },
    { name: 'Quản Bạ', note: 'Cổng trời, núi đôi', leg: '300 km' },
    { name: 'Đồng Văn', note: 'Phố cổ về đêm', leg: '110 km' },
    { name: 'Mã Pí Lèng', note: 'Đèo và sông Nho Quế', leg: '25 km' },
  ],
}

/** [name, note] type tiers, largest first; legs keep `caption`. */
const TIERS: ReadonlyArray<readonly [TypeToken, TypeToken]> = [
  ['heading', 'body'],
  ['subheading', 'body'],
  ['lead', 'caption'],
  ['body', 'caption'],
  ['caption', 'footnote'],
]

interface Stop {
  name: string
  note: string
  leg: string
}

function stops(props: RouteProps): Stop[] {
  return objs(props.stops)
    .slice(0, ROUTE_MAX)
    .map((s) => ({ name: str(s.name), note: str(s.note), leg: str(s.leg) }))
    .filter((s) => s.name)
}

const f = (v: number) => String(Math.round(v * 100) / 100)

export function layout(props: RouteProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = stops(props)
  const N = items.length
  if (N < 1) return emptyState(ctx, 'No stops')
  const colW = W / N
  const inner = Math.max(1, colW - 2 * PAD)
  const sized = !ctx.tokens.measuring && H < DEFAULT_PROBE_HEIGHT
  const legS = mutedStyle(ctx, 'caption')
  // the text band above and below the line: the tallest label at a tier, both sides alike
  const labelH = (t: readonly [TypeToken, TypeToken]) => {
    const ns = style(ctx, t[0])
    const ms = mutedStyle(ctx, t[1])
    return Math.max(
      ...items.map((s) => Math.min(NAME_LINES, linesNeeded(ctx, s.name, ns, inner)) * lineH(ns) + (s.note ? 6 + Math.min(NOTE_LINES, linesNeeded(ctx, s.note, ms, inner)) * lineH(ms) : 0))
    )
  }
  const whole = (t: readonly [TypeToken, TypeToken]) => {
    const ns = style(ctx, t[0])
    const ms = mutedStyle(ctx, t[1])
    return items.every((s) => linesNeeded(ctx, s.name, ns, inner) <= NAME_LINES && (!s.note || linesNeeded(ctx, s.note, ms, inner) <= NOTE_LINES))
  }
  // the wave needs room: two label bands, the marks and a wave of at least one leg label's height
  const room = (t: readonly [TypeToken, TypeToken]) => 2 * labelH(t) + 2 * 18 + 40 + 2 * lineH(legS) <= H
  const tier = fitTier(TIERS, (t) => t === TIERS[TIERS.length - 1] || (sized && whole(t) && room(t)), ctx)
  const nameS = style(ctx, tier[0])
  const noteS = mutedStyle(ctx, tier[1])
  const band = labelH(tier)
  const accent = ctx.resolveColor('accent').color
  const surface = ctx.resolveColor('surface').color
  const line = ctx.resolveColor('line').color
  const R = Math.max(9, Math.round(nameS.size * 0.45))
  // the end stop's ring is 1.5 R wide: every stop keeps that room between its label and the line
  const top = band + R * 1.5 + 12
  const bottom = Math.max(top, H - band - R * 1.5 - 12)
  const amp = Math.max(0, Math.min((bottom - top) / 2, 90))
  const mid = (top + bottom) / 2
  // stop i: centre of its column, up and down in turn (one stop sits on the middle)
  const pts = items.map((_, i) => ({ x: colW * i + colW / 2, y: N === 1 ? mid : mid + (i % 2 === 0 ? -amp : amp) }))
  const nodes: LayoutNode[] = []
  // the line: a smooth curve through the stops (horizontal tangents at each stop), dashed past the last stop's half
  if (N > 1) {
    let d = `M${f(pts[0].x)} ${f(pts[0].y)}`
    for (let i = 1; i < N; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const cx = (b.x - a.x) / 2
      d += `C${f(a.x + cx)} ${f(a.y)} ${f(b.x - cx)} ${f(b.y)} ${f(b.x)} ${f(b.y)}`
    }
    const path = strokePath(ctx, d, 'route.line', tintOf(surface, accent, 0.55), Math.max(4, Math.round(R * 0.45)))
    nodes.push(slot('route', { width: W, height: H }, [{ ...(path as any), stroke: { ...(path as any).stroke, dash: [14, 10] } }]))
  }
  items.forEach((s, i) => {
    const p = pts[i]
    const up = N === 1 || i % 2 === 0
    const kids: LayoutNode[] = []
    const end = i === N - 1 && N > 1
    const first = i === 0
    // marks: the start filled, the end ringed with a dot, the stops between a white dot rimmed in the accent
    if (end) {
      kids.push({ k: 'rect', part: `stop[${i}].ring`, box: { x: p.x - R * 1.5, y: p.y - R * 1.5, width: R * 3, height: R * 3 }, fill: { type: 'solid', color: tintOf(surface, accent, 0.25) }, radius: R * 1.5 })
      kids.push({ k: 'rect', part: `stop[${i}].mark`, box: { x: p.x - R, y: p.y - R, width: 2 * R, height: 2 * R }, fill: { type: 'solid', color: accent }, radius: R })
    } else if (first) {
      kids.push({ k: 'rect', part: `stop[${i}].mark`, box: { x: p.x - R, y: p.y - R, width: 2 * R, height: 2 * R }, fill: { type: 'solid', color: accent }, radius: R })
    } else {
      kids.push({ k: 'rect', part: `stop[${i}].mark`, box: { x: p.x - R, y: p.y - R, width: 2 * R, height: 2 * R }, fill: { type: 'solid', color: surface }, stroke: { color: accent, width: Math.max(3, Math.round(R * 0.4)) }, radius: R })
    }
    // the label: above an upper stop (its foot near the mark), below a lower one
    const nameH = Math.min(NAME_LINES, linesNeeded(ctx, s.name, nameS, inner)) * lineH(nameS)
    const noteH = s.note ? 6 + Math.min(NOTE_LINES, linesNeeded(ctx, s.note, noteS, inner)) * lineH(noteS) : 0
    const gap = R * 1.5 + 10
    const y0 = up ? p.y - gap - nameH - noteH : p.y + gap
    const x0 = Math.max(0, Math.min(W - inner, p.x - inner / 2))
    const nm = placeLines(ctx, s.name, nameS, { x: x0, y: y0, width: inner }, 'center', NAME_LINES, `stop[${i}].name`)
    kids.push(...nm.nodes)
    if (s.note) kids.push(...placeLines(ctx, s.note, noteS, { x: x0, y: y0 + nm.height + 6, width: inner }, 'center', NOTE_LINES, `stop[${i}].note`).nodes)
    // the leg arriving here: on the line halfway from the previous stop, in a small pill on the page colour
    if (i > 0 && s.leg) {
      const a = pts[i - 1]
      const lx = (a.x + p.x) / 2
      const ly = (a.y + p.y) / 2
      const lw = Math.min(colW - 8, 140)
      const lg = placeLines(ctx, s.leg, { ...legS, color: readableOn(legS.color, surface, 4.5) }, { x: lx - lw / 2, y: ly - lineH(legS) / 2, width: lw }, 'center', 1, `leg[${i}].text`)
      const pw = Math.min(lw, Math.ceil(lg.width) + 20)
      kids.push({ k: 'rect', part: `leg[${i}]`, box: { x: lx - pw / 2, y: ly - lineH(legS) / 2 - 4, width: pw, height: lineH(legS) + 8 }, fill: { type: 'solid', color: surface }, stroke: { color: line, width: 1 }, radius: (lineH(legS) + 8) / 2 })
      kids.push(...lg.nodes)
    }
    nodes.push(slot(`stop[${i}]`, { width: W, height: H }, kids))
  })
  return root(ctx, nodes)
}

export function capacity(props: RouteProps, box: Size): CapacityReport {
  const n = Array.isArray(props.stops) ? props.stops.length : 0
  const ok = n < 1 || box.width / Math.max(1, n) >= 150
  return capacityOf({ stops: { max: ROUTE_MAX, used: n } }, ok, [{ kind: 'truncate', slot: 'stops' }])
}

export const motion: MotionRecipe = {
  parts: ['route', 'stop[*]'],
  preset: 'stagger-children',
  partMotion: { route: { preset: 'draw-path', delay: 0 }, 'stop[*]': { preset: 'fade-up', delay: 150, stagger: 110 } },
}

export const tlsGRoute: BlockDefinition = {
  type: 'tls.g.route',
  name: 'Route',
  family: 'diagram',
  tier: 'A',
  summary: 'A schematic route: named stops on one line, the leg distance between them and a note per stop.',
  keywords: ['route', 'journey', 'trip', 'path', 'stops', 'lộ trình', 'tuyến đường', 'cung đường', 'điểm dừng'],
  category: 'process',
  scope: 'group',
  shortDescription: 'Stops on one line with leg distances',
  related: ['tls.d.itinerary', 'tls.g.timeline'],
  describe: {
    when: 'The passages name places in travel order ("A → B → C", a tour, a delivery run, a field trip): the stops and the distance of each leg.',
    avoid: 'A plan by day with several stops each (tls.d.itinerary), dated events (tls.g.timeline), or steps that are not places (tls.g.steps).',
    example: { id: 'b_route', type: 'tls.g.route', props: { stops: [{ name: 'Hanoi', note: 'Leave at 6:00' }, { name: 'Quan Ba', note: 'Heaven gate', leg: '300 km' }, { name: 'Dong Van', note: 'Old town', leg: '110 km' }] } },
  },
  schema,
  defaults,
  size: { preferred: [1600, 560], min: [700, 340] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
