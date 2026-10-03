/**
 * tls.c.recap — end-of-section summary: 2-5 numbered key points, closed by one takeaway line.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (a stack of `tls.t.numbered` and
 * `tls.t.takeaway`); `layout()` places the same specs by hand and flattens them (see `../_kit.ts`).
 * `numbered` = one badge-numbered list; `cards` = one rounded panel per point with a big number.
 * Slide scope: it fills the region and the content is vertically centred.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, CapacityReport, LayoutContext, LayoutNode } from '../../../types'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { capacityOf } from '../../diagram/_kit'
import { onSurface, composeFlat, measureHeights, pick, strings, toMeasurable, type Piece } from '../_kit'

export const RECAP_MIN = 2
export const RECAP_MAX = 5

export interface RecapProps extends Record<string, unknown> {
  points: string[]
  takeaway?: string
  style?: 'numbered' | 'cards'
}

export const schema: BlockSchema = {
  points: { type: { kind: 'list', of: { kind: 'richText', maxChars: 140 }, min: RECAP_MIN, max: RECAP_MAX }, role: 'content', label: 'Key points', required: true, guidance: 'One sentence each; **bold** the key term.' },
  takeaway: { type: { kind: 'text', maxChars: 140 }, role: 'content', label: 'Takeaway', guidance: 'The one thing to remember.' },
  style: enumSlot(['numbered', 'cards'], 'Style', 'cards = one panel per point.'),
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

const takeawaySpec = (props: RecapProps): BlockSpec | undefined =>
  props.takeaway ? { id: 'takeaway', type: 'tls.t.takeaway', props: { text: props.takeaway, tone: 'accent', label: 'Remember' } } : undefined

export function buildRecap(props: RecapProps): BlockSpec {
  const list: BlockSpec = { id: 'points', type: 'tls.t.numbered', props: { items: strings(props.points, RECAP_MAX), markerStyle: 'badge', spacing: 'roomy' } }
  return { id: 'recap', type: 'tls.l.stack', props: { gap: 'lg', sizing: 'content', children: [list, takeawaySpec(props)].filter(Boolean) as BlockSpec[] } }
}

export function layoutRecap(props: RecapProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const style = pick(props.style, STYLES, 'numbered')
  const pts = strings(props.points, RECAP_MAX)
  const gap = ctx.tokens.space.lg
  const take = takeawaySpec(props)
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
    const fill = ctx.resolveColor('surfaceAlt').color
    const on = onSurface({ type: 'solid', color: fill })
    pts.forEach((t, i) => {
      const x = i * (pw + g)
      content.push({
        id: `card[${i}]`,
        raw: [{ k: 'rect', box: { x, y: 0, width: pw, height: bodyH }, fill: { type: 'solid', color: fill }, radius: ctx.tokens.radius.lg } as LayoutNode],
        box: { x, y: 0, width: pw, height: bodyH },
      })
      content.push({ id: `number[${i}]`, spec: { id: `n${i}`, type: 'tls.t.title', props: { text: String(i + 1), size: 'title', color: 'accent', ...on } }, box: { x: x + pad, y: pad, width: inner, height: numH } })
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
  size: { preferred: [1500, 640], min: [560, 320] },
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
  motion: { parts: ['root'], preset: 'stagger-lines' },
  build: buildRecap,
})

function capacity(props: RecapProps): CapacityReport {
  const used = Array.isArray(props.points) ? props.points.length : 0
  return capacityOf({ points: { max: RECAP_MAX, used } }, true, [{ kind: 'truncate', slot: 'points' }, { kind: 'paginate' }])
}

export const tlsCRecap: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: RecapProps, ctx: LayoutContext): LayoutNode => layoutRecap(props, ctx)) as BlockDefinition['layout'],
  capacity: capacity as BlockDefinition['capacity'],
}
