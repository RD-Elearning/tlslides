/**
 * tls.d.itinerary — spro sprint 2026-11c S25 (T8, ha-giang s04: a four-day tour drawn as a thin timeline over an empty
 * slide): a day-by-day plan as one column per day — the day's label in an accent pill, its leg ("Hà Nội → Quản Bạ"),
 * an optional meta line (distance, hours, the night's stay) and the stops as a dotted list. The columns are cards that
 * fill the region's height, so a short plan never leaves an empty band under it. Up to five days in one row, six in
 * two rows of three. The text type is the largest tier at which every text is whole (never in a measuring pass).
 */
import type { BlockDefinition, BlockSchema, CapacityReport, LayoutContext, LayoutNode, MotionRecipe, Size, TypeToken } from '../../../types'
import { capacityOf, emptyState, fitTier, lineH, linesNeeded, mutedStyle, objs, placeLines, readableOn, root, str, style, tintOf } from '../../diagram/_kit'
import { slot } from '../../diagram/_motion'
import { DEFAULT_PROBE_HEIGHT } from '../../../layout/measure-block'

export const ITINERARY_MAX = 6
export const STOPS_MAX = 6
const ROW_MAX = 5
const GAP = 24
const PAD = 24

export interface ItineraryDay extends Record<string, unknown> {
  label: string
  title: string
  meta?: string
  stops?: string[]
}
export interface ItineraryProps extends Record<string, unknown> {
  days: ItineraryDay[]
}

export const schema: BlockSchema = {
  days: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 16 }, required: true, role: 'content', label: 'Day' },
          title: { type: { kind: 'text', maxChars: 48 }, required: true, role: 'content', label: 'Leg' },
          meta: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'Meta', help: 'One short fact: "160 km", "5 h drive". The places go in stops.' },
          stops: { type: { kind: 'list', of: { kind: 'text', maxChars: 48 }, max: STOPS_MAX }, role: 'content', label: 'Stops' },
        },
      },
      min: 2,
      max: ITINERARY_MAX,
    },
    role: 'content',
    label: 'Days',
    required: true,
    guidance: 'One per day, in order; stops = the places, one per item (2-4).',
  },
}

export const defaults: ItineraryProps = {
  days: [
    { label: 'Ngày 1', title: 'Hà Nội → Quản Bạ', meta: '160 km', stops: ['Cột mốc số 0', 'Dốc Bắc Sum', 'Núi đôi Cô Tiên'] },
    { label: 'Ngày 2', title: 'Quản Bạ → Đồng Văn', meta: '110 km', stops: ['Rừng thông Yên Minh', 'Dốc Thẩm Mã', 'Phố cổ Đồng Văn'] },
    { label: 'Ngày 3', title: 'Đồng Văn → Du Già', meta: '120 km', stops: ['Đèo Mã Pí Lèng', 'Thuyền sông Nho Quế'] },
  ],
}

/** [leg, stop] type tiers, largest first; the label keeps `caption`. */
const TIERS: ReadonlyArray<readonly [TypeToken, TypeToken]> = [
  ['heading', 'subheading'],
  ['heading', 'body'],
  ['subheading', 'body'],
  ['body', 'caption'],
  ['caption', 'footnote'],
]

interface Day {
  label: string
  title: string
  meta: string
  stops: string[]
}

function days(props: ItineraryProps): Day[] {
  return objs(props.days)
    .slice(0, ITINERARY_MAX)
    .map((d) => ({
      label: str(d.label),
      title: str(d.title),
      meta: str(d.meta),
      stops: (Array.isArray(d.stops) ? d.stops : []).map((s) => str(s)).filter(Boolean).slice(0, STOPS_MAX),
    }))
}

export function layout(props: ItineraryProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = days(props)
  const N = items.length
  if (N < 1) return emptyState(ctx, 'No days')
  const rows = N > ROW_MAX ? 2 : 1
  const cols = Math.ceil(N / rows)
  const colW = Math.max(1, (W - (cols - 1) * GAP) / cols)
  const rowH = Math.max(1, (H - (rows - 1) * GAP) / rows)
  const inner = Math.max(1, colW - 2 * PAD)
  const sized = !ctx.tokens.measuring && H < DEFAULT_PROBE_HEIGHT
  const labelS = style(ctx, 'caption')
  const pillH = lineH(labelS) + 12
  const dot = (s: ReturnType<typeof style>) => Math.max(6, Math.round(s.size * 0.32))
  const contentH = (t: readonly [TypeToken, TypeToken], d: Day) => {
    const ts = style(ctx, t[0])
    const ss = style(ctx, t[1])
    const ms = mutedStyle(ctx, t[1])
    const stopW = inner - dot(ss) - 12
    return (
      PAD + pillH + 14 +
      linesNeeded(ctx, d.title, ts, inner) * lineH(ts) +
      (d.meta ? 6 + linesNeeded(ctx, d.meta, ms, inner) * lineH(ms) : 0) +
      (d.stops.length ? 18 + d.stops.reduce((a, s) => a + linesNeeded(ctx, s, ss, stopW) * lineH(ss) + 8, 0) : 0) +
      PAD
    )
  }
  const whole = (t: readonly [TypeToken, TypeToken]) => {
    const ts = style(ctx, t[0])
    const ss = style(ctx, t[1])
    const ms = mutedStyle(ctx, t[1])
    const stopW = inner - dot(ss) - 12
    return items.every((d) => linesNeeded(ctx, d.title, ts, inner) <= 3 && (!d.meta || linesNeeded(ctx, d.meta, ms, inner) <= 2) && d.stops.every((s) => linesNeeded(ctx, s, ss, stopW) <= 3))
  }
  const tier = fitTier(TIERS, (t) => t === TIERS[TIERS.length - 1] || (sized && whole(t) && Math.max(...items.map((d) => contentH(t, d))) <= rowH), ctx)
  const titleS = style(ctx, tier[0])
  const stopS = style(ctx, tier[1])
  const metaS = mutedStyle(ctx, tier[1])
  const accent = ctx.resolveColor('accent').color
  const surface = ctx.resolveColor('surface').color
  const card = tintOf(surface, accent, 0.08)
  const line = ctx.resolveColor('line').color
  const pillInk = readableOn('#FFFFFF', accent, 4.5)
  const cardH = sized ? rowH : Math.max(...items.map((d) => contentH(tier, d)))
  // one numeral size for every card: the room the fullest card leaves
  const numSize = Math.min((cardH - Math.max(...items.map((d) => contentH(tier, d)))) * 0.85, inner * 0.7, 260)
  const nodes: LayoutNode[] = []
  items.forEach((d, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    const x = c * (colW + GAP)
    const y = r * (cardH + GAP)
    const kids: LayoutNode[] = [{ k: 'rect', part: `card[${i}]`, box: { x, y, width: colW, height: cardH }, fill: { type: 'solid', color: card }, radius: 16 }]
    let ty = y + PAD
    // the pill takes the label's real width (an estimate once cut "Ngày 2" to "Ngày")
    const lab = placeLines(ctx, d.label, { ...labelS, color: pillInk }, { x: x + PAD + 14, y: ty + 6, width: inner - 28 }, 'start', 1, `label[${i}]`)
    const lw = Math.min(inner, Math.ceil(lab.width) + 32)
    kids.push({ k: 'rect', part: `pill[${i}]`, box: { x: x + PAD, y: ty, width: lw, height: pillH }, fill: { type: 'solid', color: accent }, radius: pillH / 2 })
    kids.push(...lab.nodes)
    ty += pillH + 14
    const tl = placeLines(ctx, d.title, titleS, { x: x + PAD, y: ty, width: inner }, 'start', 3, `title[${i}]`)
    kids.push(...tl.nodes)
    ty += tl.height
    if (d.meta) {
      const m = placeLines(ctx, d.meta, metaS, { x: x + PAD, y: ty + 6, width: inner }, 'start', 2, `meta[${i}]`)
      kids.push(...m.nodes)
      ty += m.height + 6
    }
    if (d.stops.length) {
      ty += 8
      kids.push({ k: 'rect', part: `rule[${i}]`, box: { x: x + PAD, y: ty, width: inner, height: 2 }, fill: { type: 'solid', color: line } })
      ty += 10
      const ds = dot(stopS)
      d.stops.forEach((s, j) => {
        const st = placeLines(ctx, s, stopS, { x: x + PAD + ds + 12, y: ty, width: inner - ds - 12 }, 'start', 3, `stop[${i}].${j}`)
        kids.push({ k: 'rect', part: `stop[${i}].${j}.dot`, box: { x: x + PAD, y: ty + (lineH(stopS) - ds) / 2, width: ds, height: ds }, fill: { type: 'solid', color: accent }, radius: ds / 2 })
        kids.push(...st.nodes)
        ty += st.height + 8
      })
    }
    // the day's number, large and faint at the card's foot, when the card has room under its text
    const num = /\d+/.exec(d.label)?.[0]
    if (sized && num && numSize >= 120) {
      const ns = { ...style(ctx, 'display'), color: tintOf(card, accent, 0.22), size: numSize, lineHeight: 1 }
      kids.push(...placeLines(ctx, num, ns, { x: x + PAD, y: y + cardH - PAD - numSize, width: inner }, 'end', 1, `num[${i}]`).nodes)
    }
    nodes.push(slot(`day[${i}]`, { width: W, height: H }, kids))
  })
  return root(ctx, nodes)
}

export function capacity(props: ItineraryProps, box: Size): CapacityReport {
  const n = Array.isArray(props.days) ? props.days.length : 0
  const cols = Math.ceil(n / (n > ROW_MAX ? 2 : 1))
  const ok = n < 1 || (box.width - (cols - 1) * GAP) / Math.max(1, cols) >= 220
  return capacityOf({ days: { max: ITINERARY_MAX, used: n } }, ok, [{ kind: 'truncate', slot: 'days' }])
}

export const motion: MotionRecipe = {
  parts: ['day[*]'],
  preset: 'stagger-children',
  partMotion: { 'day[*]': { preset: 'fade-up', delay: 0, stagger: 90 } },
}

export const tlsDItinerary: BlockDefinition = {
  type: 'tls.d.itinerary',
  name: 'Itinerary',
  family: 'data',
  tier: 'A',
  summary: 'A day-by-day plan: one card per day with its leg, a fact and the stops.',
  keywords: ['itinerary', 'day by day', 'tour', 'trip', 'schedule by day', 'lịch trình', 'hành trình', 'ngày 1'],
  category: 'process',
  scope: 'group',
  shortDescription: 'One card per day: leg, fact, stops',
  related: ['tls.g.timeline', 'tls.t.kv-list'],
  describe: {
    when: 'A plan the document lays out by day (a tour, an event over several days, a training week): each day\'s route or theme and its stops.',
    avoid: 'Dated milestones of a project (tls.g.timeline) or one day\'s hours (tls.t.kv-list).',
    example: { id: 'b_itinerary', type: 'tls.d.itinerary', props: { days: [{ label: 'Day 1', title: 'Hanoi → Quan Ba', meta: '160 km', stops: ['Km 0 marker', 'Fairy twin peaks'] }, { label: 'Day 2', title: 'Quan Ba → Dong Van', stops: ['Pine forest', 'Old town at night'] }] } },
  },
  schema,
  defaults,
  size: { preferred: [1600, 640], min: [700, 360] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
