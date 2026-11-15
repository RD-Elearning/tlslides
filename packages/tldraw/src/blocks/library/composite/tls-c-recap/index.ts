/**
 * tls.c.recap — end-of-section summary: 2-5 numbered key points, closed by one takeaway line.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (a stack of `tls.t.numbered` and
 * `tls.t.takeaway`); `layout()` places the same specs by hand and flattens them (see `../_kit.ts`).
 * `numbered` = one badge-numbered list; `cards` = one rounded panel per point with a big number.
 * Slide scope: it fills the region and the content is vertically centred.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode, RichText } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { blockWord } from '../../../labels'
import { enumSlot } from '../../data/_chart/schema-kit'
import { capacityOf } from '../../diagram/_kit'
import { onSurface, composeFlat, measureHeights, pick, richItems, toMeasurable, type Piece } from '../_kit'
import { categoryInk, categoryTint } from '../../text/_engine/color'
import { growText } from '../../text/_engine/grow'

export const RECAP_MIN = 2
export const RECAP_MAX = 5

export interface RecapProps extends Record<string, unknown> {
  points: Array<string | RichText>
  takeaway?: string
  style?: 'numbered' | 'cards'
  /** C6: per point, `category:<n>` (set by the service) — a cards-style panel in the group's colour. */
  pointTones?: string[]
}

export const schema: BlockSchema = {
  points: { type: { kind: 'list', of: { kind: 'richText', maxChars: 140 }, min: RECAP_MIN, max: RECAP_MAX }, role: 'content', label: 'Key points', required: true, guidance: 'One sentence each; **bold** the key term.' },
  takeaway: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Takeaway', guidance: 'The one thing to remember.' },
  style: enumSlot(['numbered', 'cards'], 'Style', 'cards = one panel per point.'),
  pointTones: { type: { kind: 'list', of: { kind: 'text', maxChars: 12 } }, role: 'option', label: 'Point colours', help: 'Per point: `category:<n>` draws the panel in the colour the document gives its group (set by the service).' },
}

export const defaults: RecapProps = {
  points: [
    'A sample describes the data with a **centre** and a **spread**',
    'A chart must answer **one** question',
    'A confidence interval is about the **method**, not one result',
    'A test only compares what you measured',
  ],
  takeaway: 'Plot first, calculate second.',
  style: 'numbered',
}

const STYLES = ['numbered', 'cards'] as const

// sprint 2026-11c T30: the takeaway's label in the deck's language
const takeawaySpec = (props: RecapProps, locale?: string): BlockSpec | undefined =>
  props.takeaway ? { id: 'takeaway', type: 'tls.t.takeaway', props: { text: props.takeaway, tone: 'accent', label: blockWord('remember', locale) } } : undefined

export function buildRecap(props: RecapProps): BlockSpec {
  const list: BlockSpec = { id: 'points', type: 'tls.t.numbered', props: { items: richItems(props.points, RECAP_MAX), markerStyle: 'badge', spacing: 'roomy' } }
  return { id: 'recap', type: 'tls.l.stack', props: { gap: 'lg', sizing: 'content', children: [list, takeawaySpec(props)].filter(Boolean) as BlockSpec[] } }
}

export function layoutRecap(props: RecapProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const style = pick(props.style, STYLES, 'numbered')
  const pts = richItems(props.points, RECAP_MAX)
  const gap = ctx.tokens.space.lg
  const take = takeawaySpec(props, ctx.tokens.locale)
  const pieces: Piece[] = []
  const cw = Math.min(W, 1500)
  const x0 = style === 'numbered' ? 0 : 0
  let bodyH = 0
  let content: Piece[] = []

  if (style === 'numbered') {
    const list: BlockSpec = { id: 'points', type: 'tls.t.numbered', props: { items: pts, markerStyle: 'badge', spacing: 'roomy' } }
    bodyH = measureHeights(ctx, [list], cw)[0]
    content = [{ id: 'points', spec: list, box: { x: x0, y: 0, width: cw, height: bodyH } }]
  } else {
    const n = Math.max(1, pts.length)
    const g = ctx.tokens.space.md
    const pad = n >= 4 ? ctx.tokens.space.md : ctx.tokens.space.lg
    const pw = Math.max(1, (W - g * (n - 1)) / n)
    const inner = Math.max(1, pw - 2 * pad)
    const numH = measureHeights(ctx, [{ id: 'n', type: 'tls.t.title', props: { text: '8', size: 'title' } }], inner)[0]
    const textType = n >= 4 ? 'tls.t.caption' : 'tls.t.body'
    const textHs = measureHeights(ctx, pts.map((t, i) => ({ id: `p${i}`, type: textType, props: { text: toMeasurable(t) } })), inner)
    bodyH = 2 * pad + numH + ctx.tokens.space.sm + Math.max(0, ...textHs)
    const base = ctx.resolveColor('surfaceAlt').color
    const page = ctx.resolveColor('surface').color
    const tones = Array.isArray(props.pointTones) ? props.pointTones : []
    pts.forEach((t, i) => {
      const x = i * (pw + g)
      // C6: a point of a named group — the panel tinted and rimmed, the number in the group's colour
      const tint = categoryTint(ctx, tones[i], page)
      const fill = tint ?? base
      const on = onSurface({ type: 'solid', color: fill })
      const ink = categoryInk(ctx, tones[i], fill)
      const rim = tint ? categoryInk(ctx, tones[i], page) : undefined
      content.push({
        id: `card[${i}]`,
        raw: [{ k: 'rect', box: { x, y: 0, width: pw, height: bodyH }, fill: { type: 'solid', color: fill }, ...(rim ? { stroke: { color: rim, width: 3 } } : {}), radius: ctx.tokens.radius.lg } as LayoutNode],
        box: { x, y: 0, width: pw, height: bodyH },
      })
      content.push({ id: `number[${i}]`, spec: { id: `n${i}`, type: 'tls.t.title', props: { text: String(i + 1), size: 'title', color: ink ?? 'accent', ...on } }, box: { x: x + pad, y: pad, width: inner, height: numH } })
      content.push({ id: `point[${i}]`, spec: { id: `p${i}`, type: textType, props: { text: toMeasurable(t), ...on } }, box: { x: x + pad, y: pad + numH + ctx.tokens.space.sm, width: inner, height: textHs[i] } })
    })
  }
  const tw = style === 'numbered' ? cw : W
  const takeH = take ? measureHeights(ctx, [take], tw)[0] : 0
  const needed = bodyH + (take ? gap * 1.5 + takeH : 0)
  const total = Math.max(H, Math.ceil(needed))
  const top = (total - needed) / 2
  // Raw leaves carry their own absolute boxes, so the vertical centring shifts them as well as the piece box.
  for (const p of content) {
    pieces.push({
      ...p,
      ...(p.raw ? { raw: p.raw.map((n) => ({ ...n, box: { ...n.box, y: n.box.y + top } }) as LayoutNode) } : {}),
      box: { ...p.box, y: p.box.y + top },
    })
  }
  if (take) pieces.push({ id: 'takeaway', spec: take, box: { x: 0, y: top + bodyH + gap * 1.5, width: tw, height: takeH } })
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<RecapProps>({
  type: 'tls.c.recap',
  name: 'Recap',
  family: 'composite',
  tier: 'A',
  summary: 'Numbered key points to remember, closed by one takeaway line.',
  keywords: ['recap', 'summary', 'key points', 'what we learned', 'takeaways', 'review', 'wrap up'],
  category: 'closing',
  scope: 'slide',
  shortDescription: 'Numbered key points to remember, closed by one takeaway line',
  related: ['tls.c.closing', 'tls.t.numbered', 'tls.t.takeaway'],
  schema,
  defaults,
  size: { preferred: [1500, 640], min: [900, 380] },
  describe: {
    when: 'End of a section or lecture: what we learned.',
    avoid: 'The final thank-you slide: tls.c.closing.',
    example: {
      id: 'b_recap',
      type: 'tls.c.recap',
      props: {
        points: ['Describe data with centre and **spread**', 'Pick a chart for **one** question', 'Intervals describe the **method**'],
        takeaway: 'Plot first, calculate second.',
        style: 'numbered',
      },
    },
  },
  // RVM5: the points read in first — `numbered`: badge, number, text 40 ms apart, points 120 ms
  // apart, in place; `cards`: card, number, text — then the takeaway band and its texts.
  // Was `root` stagger-lines (one unit).
  motion: {
    parts: ['points', 'card[*]', 'number[*]', 'point[*]', 'takeaway'],
    preset: 'stagger-lines',
    partMotion: {
      points: { preset: 'sweep-nodes', delay: 0, stagger: 40 },
      'card[*]': { preset: 'sweep-nodes', delay: 0, stagger: 120 },
      'number[*]': { preset: 'fade-up', delay: 80, stagger: 120 },
      'point[*]': { preset: 'fade-up', delay: 160, stagger: 120 },
      takeaway: { preset: 'sweep-nodes', delay: 800, stagger: 60 },
    },
  },
  build: buildRecap,
})

function capacity(props: RecapProps): CapacityReport {
  const used = Array.isArray(props.points) ? props.points.length : 0
  return capacityOf({ points: { max: RECAP_MAX, used } }, true, [{ kind: 'truncate', slot: 'points' }, { kind: 'paginate' }])
}

export const tlsCRecap: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  // spro S29 7c (S24: 3 of 18 small-in-space slides were a recap alone in a tall region): the
  // points and the takeaway step their type up while the recap still shows whole in its box
  layout: ((props: RecapProps, ctx: LayoutContext): LayoutNode => growText(ctx, (c) => layoutRecap(props, c))) as BlockDefinition['layout'],
  capacity: capacity as BlockDefinition['capacity'],
}
