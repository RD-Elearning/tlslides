/**
 * tls.g.cycle-detail — spro sprint 2026-11b S09-7: a cycle whose 3–6 stages each carry a sentence.
 *
 * A ring of numbered stage dots in the middle (arrows along the ring, the optional centre text in
 * it); each stage's title and text sit in the column on its side of the ring (right for the stages
 * from 12 to 6 o'clock clockwise, left for the others), at the height of its dot where room allows,
 * numbered like its dot. Text never sits inside the art. `ring-cards` puts each stage on a card.
 */
import type { BlockDefinition, BlockSchema, CapacityReport, LayoutContext, LayoutNode, MotionRecipe, TypeToken } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { arrowHead, asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, objs, onColor, placeLines, rampColor, root, showsWhole, str, strokePath, style, mutedStyle, tierStart, tintOf, lineH } from '../_kit'
import { slot, STEP, WIRE_AFTER } from '../_motion'

export const STAGE_MAX = 6
const VARIANTS = ['ring', 'ring-cards'] as const

export interface CycleDetailProps extends Record<string, unknown> {
  stages: Array<{ title: string; text: string; icon?: string }>
  center?: string
  variant?: (typeof VARIANTS)[number]
}

export const schema: BlockSchema = {
  stages: {
    type: {
      kind: 'list',
      of: { kind: 'object', fields: { title: { type: { kind: 'text', maxChars: 32 }, role: 'content', label: 'title', required: true }, text: { type: { kind: 'text', maxChars: 110 }, role: 'content', label: 'text' }, icon: { type: { kind: 'icon' }, role: 'content', label: 'icon' } } },
      min: 3,
      max: STAGE_MAX,
    },
    role: 'content',
    label: 'Stages',
    required: true,
    guidance: 'In cycle order. Each: `title` (≤ 32) and `text` = what happens in that stage (one sentence, ≤ 110).',
  },
  center: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Centre', guidance: 'The name of the cycle (≤ 40), shown in the ring.' },
  variant: enumSlot([...VARIANTS], 'Variant', 'ring (default) or ring-cards (each stage on a card).'),
}

export const defaults: CycleDetailProps = {
  stages: [
    { title: 'Evaporation', text: 'The sun heats water in seas and lakes, and it rises as vapour.' },
    { title: 'Condensation', text: 'The vapour cools high in the air and forms clouds of droplets.' },
    { title: 'Precipitation', text: 'Droplets join and fall as rain, snow or hail.' },
    { title: 'Collection', text: 'Water gathers in rivers, lakes and the ground, and flows back to the sea.' },
  ],
  center: 'The water cycle',
  variant: 'ring',
}

type Tier = { title: TypeToken; text: TypeToken; dot: number }
const TIERS: readonly Tier[] = [
  { title: 'subheading', text: 'lead', dot: 64 },
  { title: 'subheading', text: 'body', dot: 56 },
  { title: 'lead', text: 'body', dot: 52 },
  { title: 'body', text: 'caption', dot: 44 },
  { title: 'caption', text: 'footnote', dot: 36 },
]

export function layout(props: CycleDetailProps, ctx: LayoutContext): LayoutNode {
  // the largest type first; at each, a smaller ring before smaller type (the columns get the width)
  for (const t of TIERS.slice(tierStart(ctx, TIERS.length))) {
    for (const ring of [1, 0.75, 0.55]) {
      const node = layoutTier(props, ctx, t, ring)
      if (node) return node
    }
  }
  return layoutTier(props, ctx, null, 0.55) as LayoutNode
}

function layoutTier(props: CycleDetailProps, ctx: LayoutContext, pick: Tier | null, ring = 1): LayoutNode | null {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const stages = objs(props.stages).slice(0, STAGE_MAX).map((s) => ({ title: str(s.title).slice(0, 32), text: str(s.text).slice(0, 110) }))
  const N = stages.length
  if (N < 1) return emptyState(ctx, 'No stages')
  const tier = pick ?? TIERS[TIERS.length - 1]
  const c = chartColors(ctx)
  const cards = enumOf(props.variant, VARIANTS, 'ring') === 'ring-cards'
  const tS = style(ctx, tier.title, c.text)
  const xS = mutedStyle(ctx, tier.text)
  const sp = ctx.tokens.space
  const D = clamp(Math.min(H * 0.86, W * 0.34) * ring, 150, 520)
  const gap = sp.xl
  const colW = Math.max(120, (W - D - 2 * gap) / 2)
  const pad = cards ? (tier.dot >= 52 ? sp.md : sp.sm) : 0
  const cellGap = tier.dot >= 52 ? sp.lg : sp.md
  const numW = tier.dot * 0.62
  const iw = colW - 2 * pad - numW - sp.sm
  const cx = W / 2
  const cy = H / 2
  const R = D / 2 - tier.dot / 2
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N
  // side of each stage: right from 12 o'clock to before 6, left after (the 6 o'clock one goes to the lighter side)
  const side = stages.map((_, i) => {
    const a = ((ang(i) + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    return a < Math.PI - 1e-6 ? 1 : a > Math.PI + 1e-6 ? -1 : 0
  })
  const rightN = side.filter((s) => s === 1).length
  const leftN = side.filter((s) => s === -1).length
  side.forEach((s, i) => s === 0 && (side[i] = leftN <= rightN ? -1 : 1))
  const cellH = stages.map((s) => 2 * pad + linesHeight(ctx, s.title, tS, iw, 2) + (s.text ? sp.xs + linesHeight(ctx, s.text, xS, iw, 4) : 0))
  const cellY: number[] = Array(N)
  for (const sd of [1, -1]) {
    const idx = stages.map((_, i) => i).filter((i) => side[i] === sd).sort((a, b) => Math.sin(ang(a)) - Math.sin(ang(b)))
    const total = idx.reduce((a, i) => a + cellH[i], 0) + cellGap * Math.max(0, idx.length - 1)
    if (total > H + 0.5 && pick) return null
    let y = 0
    idx.forEach((i) => {
      const want = cy + R * Math.sin(ang(i)) - cellH[i] / 2
      cellY[i] = Math.max(y, want)
      y = cellY[i] + cellH[i] + cellGap
    })
    // pull the column back up into the box from the bottom, then keep order and gaps from the top
    let next = H
    for (let k = idx.length - 1; k >= 0; k--) {
      const i = idx[k]
      cellY[i] = Math.min(cellY[i], next - cellH[i])
      next = cellY[i] - cellGap
    }
    let yy = 0
    idx.forEach((i) => {
      cellY[i] = Math.max(cellY[i], yy)
      yy = cellY[i] + cellH[i] + cellGap
    })
  }

  const out: LayoutNode[] = []
  out.push({ k: 'rect', part: 'ring', box: { x: cx - R, y: cy - R, width: 2 * R, height: 2 * R }, stroke: { color: tintOf(c.surface, c.line, 0.2), width: 3 }, radius: R })
  // arrows on the ring between dots
  const wires: LayoutNode[][] = stages.map(() => [])
  if (N > 1) {
    const da = (2 * Math.PI) / N
    const trim = (tier.dot / 2 + 10) / R
    for (let i = 0; i < N; i++) {
      const a0 = ang(i) + trim
      const a1 = ang(i) + da - trim - 12 / R
      if (a1 <= a0) continue
      const P = (a: number) => ({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) })
      const p0 = P(a0)
      const p1 = P(a1)
      const f = (v: number) => String(Math.round(v * 100) / 100)
      wires[i].push(strokePath(ctx, `M${f(p0.x)} ${f(p0.y)}A${f(R)} ${f(R)} 0 0 1 ${f(p1.x)} ${f(p1.y)}`, `arrow[${i}]`, c.muted, 3))
      const tip = P(a1 + 12 / R)
      wires[i].push(arrowHead(ctx, tip, -Math.sin(a1), Math.cos(a1), 12, c.muted, `arrow[${i}].head`))
    }
  }
  const center = str(props.center).slice(0, 40)
  if (center) {
    // the centre text inside the ring's hole (its corners within the inner radius)
    const rin = R - tier.dot / 2 - 8
    let placed = false
    for (const tok of [tier.title, 'body', 'caption'] as TypeToken[]) {
      const cS = style(ctx, tok, ctx.resolveColor('accent').color)
      const w = Math.max(40, rin * 1.5)
      const h = linesHeight(ctx, center, cS, w, 3)
      if (Math.hypot(w / 2, h / 2) > rin || linesHeight(ctx, center, cS, w, 9) > h) continue
      out.push(...placeLines(ctx, center, cS, { x: cx - w / 2, y: cy - h / 2, width: w }, 'center', 3, 'center').nodes)
      placed = true
      break
    }
    if (!placed && pick) return null
  }
  stages.forEach((s, i) => {
    const kids: LayoutNode[] = []
    const fill = rampColor(ctx, 'gradient', i, N)
    const ink = onColor(ctx, fill)
    const dx = cx + R * Math.cos(ang(i))
    const dy = cy + R * Math.sin(ang(i))
    kids.push({ k: 'rect', part: `dot[${i}]`, box: { x: dx - tier.dot / 2, y: dy - tier.dot / 2, width: tier.dot, height: tier.dot }, fill: { type: 'solid', color: fill }, radius: tier.dot / 2 })
    const nS = style(ctx, tier.title, ink)
    kids.push(...placeLines(ctx, String(i + 1), nS, { x: dx - tier.dot / 2, y: dy - lineH(nS) / 2, width: tier.dot }, 'center', 1, `num[${i}]`).nodes)
    const x = side[i] > 0 ? W - colW : 0
    const y = cellY[i]
    if (cards) kids.push({ k: 'rect', part: `card[${i}]`, box: { x, y, width: colW, height: cellH[i] }, fill: { type: 'solid', color: tintOf(c.surface, fill, 0.1) }, stroke: { color: fill, width: 2 }, radius: 14 })
    const mS = style(ctx, tier.title, fill)
    kids.push(...placeLines(ctx, String(i + 1), mS, { x: x + pad, y: y + pad, width: numW }, 'start', 1, `mark[${i}]`).nodes)
    const th = linesHeight(ctx, s.title, tS, iw, 2)
    kids.push(...placeLines(ctx, s.title, tS, { x: x + pad + numW + sp.sm, y: y + pad, width: iw }, 'start', 2, `title[${i}]`).nodes)
    if (s.text) kids.push(...placeLines(ctx, s.text, xS, { x: x + pad + numW + sp.sm, y: y + pad + th + sp.xs, width: iw }, 'start', 4, `text[${i}]`).nodes)
    out.push(slot(`stage[${i}]`, { width: W, height: H }, kids))
  })
  wires.forEach((w, i) => out.push(slot(`wire[${i}]`, { width: W, height: H }, w)))
  const tree = root(ctx, out)
  return pick && !showsWhole(ctx, tree) ? null : tree
}

export function capacity(props: CycleDetailProps): CapacityReport {
  return capacityOf({ stages: { max: STAGE_MAX, used: asArr(props.stages).length } }, true, [
    { kind: 'reflow', to: 'tls.c.process-detail' },
    { kind: 'truncate', slot: 'stages' },
  ])
}

export const motion: MotionRecipe = {
  parts: ['ring', 'center', 'stage[*]', 'wire[*]'],
  preset: 'sweep-nodes',
  partMotion: {
    ring: { preset: 'sweep-nodes', delay: 0 },
    center: { preset: 'sweep-nodes', delay: 60 },
    'stage[*]': { preset: 'field-in', delay: 120, stagger: STEP * 2 },
    'wire[*]': { preset: 'draw-path', delay: 120 + WIRE_AFTER + STEP, stagger: STEP * 2 },
  },
}

export const tlsGCycleDetail: BlockDefinition = {
  type: 'tls.g.cycle-detail',
  name: 'Cycle with descriptions',
  family: 'diagram',
  tier: 'A',
  summary: 'A cycle of 3–6 stages, each with its title and a sentence beside the ring.',
  keywords: ['cycle', 'loop', 'stages', 'lifecycle', 'chu trình', 'vòng tuần hoàn', 'giai đoạn'],
  category: 'process',
  scope: 'group',
  shortDescription: 'A cycle whose stages each carry a sentence',
  related: ['tls.g.cycle', 'tls.c.process-detail', 'tls.g.orbit'],
  describe: {
    when: 'A cycle (a natural cycle, a life cycle, a feedback loop) whose 3–6 stages each need a sentence to explain them.',
    avoid: 'Stage names only: tls.g.cycle. Steps with a start and an end: tls.c.process-detail.',
    example: { id: 'b_cycle_detail', type: 'tls.g.cycle-detail', props: { stages: defaults.stages, center: defaults.center } },
  },
  schema,
  defaults,
  size: { preferred: [1600, 760], min: [1200, 620] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
