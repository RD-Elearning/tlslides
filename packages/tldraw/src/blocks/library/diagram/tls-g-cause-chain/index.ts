/**
 * tls.g.cause-chain — spro sprint 2026-11b S09-8: causes → one effect → its consequences, in three bands
 * joined by arrows. `columns`: left to right (causes stacked on the left, the effect in the middle,
 * consequences on the right); `funnel-in`: top to bottom (causes in a row converging on the effect,
 * consequences in a row under it). Every box is sized for its text; arrows run box edge to box edge.
 */
import type { BlockDefinition, BlockSchema, Box, CapacityReport, LayoutContext, LayoutNode, MotionRecipe, TypeToken } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { arrowHead, asArr, capacityOf, chartColors, emptyState, enumOf, linesHeight, onColor, placeLines, root, showsWhole, str, strokePath, style, tierStart, tintOf } from '../_kit'
import { slot, STEP, WIRE_AFTER } from '../_motion'

const VARIANTS = ['columns', 'funnel-in'] as const

export interface CauseChainProps extends Record<string, unknown> {
  causes: string[]
  effect: string
  consequences?: string[]
  variant?: (typeof VARIANTS)[number]
}

export const schema: BlockSchema = {
  causes: { type: { kind: 'list', of: { kind: 'text', maxChars: 90 }, min: 1, max: 4 }, role: 'content', label: 'Causes', required: true, guidance: '1–4 causes, each one short sentence (≤ 90).' },
  effect: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Effect', required: true, guidance: 'The effect they lead to (≤ 90).' },
  consequences: { type: { kind: 'list', of: { kind: 'text', maxChars: 90 }, min: 0, max: 3 }, role: 'content', label: 'Consequences', guidance: '0–3 consequences of the effect (≤ 90 each).' },
  variant: enumSlot([...VARIANTS], 'Variant', 'columns (default: left to right) or funnel-in (top to bottom).'),
}

export const defaults: CauseChainProps = {
  causes: ['Forests are cleared for farmland', 'Factories and cars burn coal, oil and gas'],
  effect: 'More carbon dioxide stays in the air and traps heat',
  consequences: ['Average temperatures rise', 'Sea levels rise as ice melts'],
  variant: 'columns',
}

type Tier = { text: TypeToken; effect: TypeToken }
const TIERS: readonly Tier[] = [
  { text: 'lead', effect: 'subheading' },
  { text: 'body', effect: 'lead' },
  { text: 'caption', effect: 'body' },
  { text: 'footnote', effect: 'caption' },
]

const list = (v: unknown, max: number) => (Array.isArray(v) ? v : []).map((x) => str(x).slice(0, 90)).filter((x) => x.trim()).slice(0, max)

export function layout(props: CauseChainProps, ctx: LayoutContext): LayoutNode {
  for (const t of TIERS.slice(tierStart(ctx, TIERS.length), -1)) {
    const node = layoutTier(props, ctx, t)
    if (node) return node
  }
  return layoutTier(props, ctx, null) as LayoutNode
}

function layoutTier(props: CauseChainProps, ctx: LayoutContext, pick: Tier | null): LayoutNode | null {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const causes = list(props.causes, 4)
  const cons = list(props.consequences, 3)
  const effect = str(props.effect).slice(0, 90)
  if (!causes.length && !effect) return emptyState(ctx, 'No causes')
  const tier = pick ?? TIERS[TIERS.length - 1]
  const c = chartColors(ctx)
  const accent = ctx.resolveColor('accent').color
  const sp = ctx.tokens.space
  const tS = style(ctx, tier.text, c.text)
  const eS = style(ctx, tier.effect, onColor(ctx, accent))
  const pad = sp.md
  const funnel = enumOf(props.variant, VARIANTS, 'columns') === 'funnel-in'
  const boxH = (t: string, s: typeof tS, w: number) => 2 * pad + linesHeight(ctx, t, s, Math.max(1, w - 2 * pad), 4)
  const bands = cons.length ? 3 : 2
  const out: LayoutNode[] = []
  const boxes: Array<{ box: Box; text: string; s: typeof tS; part: string; fill: string; stroke?: string }> = []
  if (!funnel) {
    const arrowGap = Math.max(64, W * 0.06)
    const colW = Math.max(1, (W - arrowGap * (bands - 1)) / bands)
    const stack = (items: string[], x: number, part: string) => {
      const hs = items.map((t) => boxH(t, tS, colW))
      const total = hs.reduce((a, h) => a + h, 0) + sp.lg * Math.max(0, items.length - 1)
      let y = Math.max(0, (H - total) / 2)
      items.forEach((t, i) => {
        boxes.push({ box: { x, y, width: colW, height: hs[i] }, text: t, s: tS, part: `${part}[${i}]`, fill: tintOf(c.surface, accent, 0.08), stroke: tintOf(c.surface, accent, 0.4) })
        y += hs[i] + sp.lg
      })
      return total
    }
    if (stack(causes, 0, 'cause') > H + 0.5 && pick) return null
    const eh = boxH(effect, eS, colW)
    boxes.push({ box: { x: colW + arrowGap, y: (H - eh) / 2, width: colW, height: eh }, text: effect, s: eS, part: 'effect', fill: accent })
    if (cons.length && stack(cons, 2 * (colW + arrowGap), 'consequence') > H + 0.5 && pick) return null
  } else {
    const rowGap = Math.max(56, H * 0.08)
    const row = (items: string[], y: number, part: string, w: number) => {
      const n = items.length
      const cw = Math.max(1, (W - sp.lg * (n - 1)) / n)
      const bw = Math.max(1, Math.min(cw, w))
      const hs = items.map((t) => boxH(t, tS, bw))
      const h = Math.max(...hs)
      const x0 = (W - (bw * n + sp.lg * (n - 1))) / 2
      items.forEach((t, i) => boxes.push({ box: { x: x0 + i * (bw + sp.lg), y, width: bw, height: h }, text: t, s: tS, part: `${part}[${i}]`, fill: tintOf(c.surface, accent, 0.08), stroke: tintOf(c.surface, accent, 0.4) }))
      return h
    }
    const ew = Math.min(W, Math.max(W * 0.5, 480))
    const ch = row(causes, 0, 'cause', W * 0.4)
    const eh = boxH(effect, eS, ew)
    const ey = ch + rowGap
    boxes.push({ box: { x: (W - ew) / 2, y: ey, width: ew, height: eh }, text: effect, s: eS, part: 'effect', fill: accent })
    let bottom = ey + eh
    if (cons.length) bottom = ey + eh + rowGap + row(cons, ey + eh + rowGap, 'consequence', W * 0.4)
    if (bottom > H + 0.5 && pick) return null
    // centre the bands vertically in the box
    const dy = Math.max(0, (H - bottom) / 2)
    boxes.forEach((b) => (b.box.y += dy))
  }
  const effectBox = boxes.find((b) => b.part === 'effect')!.box
  const centre = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
  const wires: LayoutNode[] = []
  let k = 0
  for (const b of boxes) {
    if (b.part === 'effect') continue
    const isCause = b.part.startsWith('cause')
    const [from, to] = isCause ? [b.box, effectBox] : [effectBox, b.box]
    const cf = centre(from)
    const ct = centre(to)
    const clampIn = (v: number, lo: number, hi: number) => Math.max(lo + pad, Math.min(hi - pad, v))
    // arrows fan into the effect (and out of it): the end on the effect sits 35 % of the way towards
    // the other box, inside the effect's edge
    let start: { x: number; y: number }
    let end: { x: number; y: number }
    if (!funnel) {
      start = { x: from.x + from.width + 6, y: isCause ? cf.y : clampIn(cf.y + (ct.y - cf.y) * 0.35, from.y, from.y + from.height) }
      end = { x: to.x - 8, y: isCause ? clampIn(ct.y + (cf.y - ct.y) * 0.35, to.y, to.y + to.height) : ct.y }
    } else {
      start = { x: isCause ? cf.x : clampIn(cf.x + (ct.x - cf.x) * 0.35, from.x, from.x + from.width), y: from.y + from.height + 6 }
      end = { x: isCause ? clampIn(ct.x + (cf.x - ct.x) * 0.35, to.x, to.x + to.width) : ct.x, y: to.y - 8 }
    }
    const dx = end.x - start.x
    const dy = end.y - start.y
    const len = Math.hypot(dx, dy) || 1
    const f = (v: number) => String(Math.round(v * 100) / 100)
    const stop = { x: end.x - (dx / len) * 12, y: end.y - (dy / len) * 12 }
    wires.push(slot(`arrow[${k}]`, { width: W, height: H }, [strokePath(ctx, `M${f(start.x)} ${f(start.y)}L${f(stop.x)} ${f(stop.y)}`, `arrow[${k}].line`, c.muted, 3), arrowHead(ctx, end, dx / len, dy / len, 14, c.muted, `arrow[${k}].head`)]))
    k++
  }
  for (const b of boxes) {
    const kids: LayoutNode[] = [{ k: 'rect', part: `${b.part}.box`, box: b.box, fill: { type: 'solid', color: b.fill }, ...(b.stroke ? { stroke: { color: b.stroke, width: 2 } } : {}), radius: 14 }]
    const tw = Math.max(1, b.box.width - 2 * pad)
    const th = linesHeight(ctx, b.text, b.s, tw, 4)
    kids.push(...placeLines(ctx, b.text, b.s, { x: b.box.x + pad, y: b.box.y + (b.box.height - th) / 2, width: tw }, 'center', 4, `${b.part}.text`).nodes)
    out.push(slot(b.part, { width: W, height: H }, kids))
  }
  const ordered = [...out.filter((n) => /^cause/.test(n.part ?? '')), ...wires.slice(0, causes.length), ...out.filter((n) => n.part === 'effect'), ...wires.slice(causes.length), ...out.filter((n) => /^consequence/.test(n.part ?? ''))]
  const tree = root(ctx, ordered)
  return pick && !showsWhole(ctx, tree) ? null : tree
}

export function capacity(props: CauseChainProps): CapacityReport {
  return capacityOf({ causes: { max: 4, used: asArr(props.causes).length }, consequences: { max: 3, used: asArr(props.consequences).length } }, true, [
    { kind: 'reflow', to: 'tls.g.concept-map' },
    { kind: 'truncate', slot: 'causes' },
  ])
}

export const motion: MotionRecipe = {
  parts: ['cause[*]', 'arrow[*]', 'effect', 'consequence[*]'],
  preset: 'sweep-nodes',
  partMotion: {
    'cause[*]': { preset: 'field-in', delay: 0, stagger: STEP },
    'arrow[*]': { preset: 'sweep-nodes', delay: STEP * 3 + WIRE_AFTER, stagger: STEP / 2 },
    effect: { preset: 'field-in', delay: STEP * 5 },
    'consequence[*]': { preset: 'field-in', delay: STEP * 7, stagger: STEP },
  },
}

export const tlsGCauseChain: BlockDefinition = {
  type: 'tls.g.cause-chain',
  name: 'Cause chain',
  family: 'diagram',
  tier: 'A',
  summary: '1–4 causes lead to one effect, which leads to 0–3 consequences, joined by arrows.',
  keywords: ['cause', 'effect', 'consequence', 'why', 'chain', 'nguyên nhân', 'kết quả', 'hệ quả'],
  category: 'relationship',
  scope: 'group',
  shortDescription: 'Causes → effect → consequences with arrows',
  related: ['tls.g.fishbone', 'tls.g.concept-map', 'tls.g.flow', 'tls.c.problem-solution'],
  describe: {
    when: 'Why something happens and what follows: 1–4 causes, the effect they produce and its consequences.',
    avoid: 'Steps in order: tls.c.process-detail. Many causes in categories: a fishbone. Concepts with named relations: tls.g.concept-map.',
    example: { id: 'b_cause_chain', type: 'tls.g.cause-chain', props: { causes: defaults.causes, effect: defaults.effect, consequences: defaults.consequences } },
  },
  schema,
  defaults,
  size: { preferred: [1600, 700], min: [1200, 600] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
