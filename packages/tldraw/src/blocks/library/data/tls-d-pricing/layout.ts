/**
 * Pure layout for tls.d.pricing — a row of plan cards.
 *
 * Each card's surface is a `tls.l.card` laid out through `ctx.layoutChild` (flattened to absolute
 * leaves, because the SVG renderer ignores group offsets); the text, ticks and button are measured
 * and placed here. `align: stretch` gives every card the same height (the whole box, or the tallest
 * content when that is more); `top` lets each card hug its own content. The featured plan is
 * `raised` (full height with an accent strip; the others sit lower), `outline` (accent outline) or
 * `filled` (accent surface).
 *
 * Parts: `plan[i]` (group), `card[i]`, `featured[i]`, `name[i]`, `price[i]`, `period[i]`,
 * `description[i]`, `rule[i]`, `feature[i].<j>` (+ `.icon`), `cta[i]` (+ `.label`).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, ResolvedTextStyle, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import type { PricingProps } from './schema'
import { PRICING_MAX_FEATURES, PRICING_MAX_PLANS } from './schema'
import { asArr, capacityOf, emptyState, enumOf, lineH, onColor, readableOn, str, tintOf } from '../_chart/kit'
import { flattenChild } from '../_table/kit'
import { cardNodes, cardPaint } from '../../composite/_kit'
import { iconLeaf } from '../../text/_engine/icon'
import { placeText } from '../../text/_engine/text-place'

/** Measured text is up to ~35% narrower than the real font; wrap a little early. */
const WRAP = 1.12
/** Price/period box slack over the measured width (AC4: measured widths are true since LO5; was 1.2). */
const PRICE_SLACK = 1.05

interface Plan {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  featured: boolean
}

function readPlans(props: PricingProps): Plan[] {
  return asArr<Record<string, unknown>>(props.plans)
    .slice(0, PRICING_MAX_PLANS)
    .map((p) => ({
      name: str(p?.name),
      price: str(p?.price),
      period: str(p?.period),
      description: str(p?.description),
      features: asArr<unknown>(p?.features).map(str).filter(Boolean).slice(0, PRICING_MAX_FEATURES),
      cta: str(p?.cta),
      featured: p?.featured === true,
    }))
}

/**
 * AC4 lead review — type tiers, roomy first. A tall box (a pricing slide's whole region) takes the
 * roomy tier: bigger name, price, features and button, more padding; the first tier whose tallest
 * card fits the box wins (fixed point: laid out again at its own painted height it picks the same
 * tier, since a tier that did not fit the box cannot fit a shorter one). `compact` is the old look.
 */
interface Tier {
  pad: 'lg' | 'xl'
  name: 'lead' | 'subheading'
  price: (n: number) => 'display' | 'title' | 'heading'
  small: 'caption' | 'body'
  gap: 'xs' | 'sm'
  /** stretch: cards grow to this × their content (≤ the box), button at the foot */
  grow: number
}
const TIERS: Tier[] = [
  { pad: 'xl', name: 'subheading', price: (n) => (n >= 4 ? 'title' : 'display'), small: 'body', gap: 'sm', grow: 1.25 },
  { pad: 'lg', name: 'lead', price: (n) => (n >= 4 ? 'heading' : 'title'), small: 'caption', gap: 'xs', grow: 1 },
]

interface Content {
  nodes: LayoutNode[]
  /** Height of everything above the button (and the button's own height when present). */
  bodyH: number
  ctaH: number
  /** Re-place the button at the card bottom: returns its nodes for a given card height. */
  cta: (cardH: number) => LayoutNode[]
  /** the tier's card padding */
  pad: number
  /** where the rule (features) would start without alignment */
  ruleY: number
  /** the price (and period) fit the card width at the shrink floor or above */
  priceFits: boolean
}

/** The card's content, relative to the card's top-left corner. */
function buildContent(ctx: LayoutContext, p: Plan, i: number, cardW: number, o: { filled: boolean; showCta: boolean; showDesc: boolean; icon: string; count: number; tier: Tier; ruleAt?: number }): Content {
  const sp = ctx.tokens.space
  const t = o.tier
  const pad = sp[t.pad]
  const gx = sp[t.gap]
  const innerW = Math.max(1, cardW - pad * 2)
  const accent = ctx.resolveColor('accent').color
  const text = ctx.resolveColor('text').color
  const muted = ctx.resolveColor('textMuted').color
  const alt = ctx.resolveColor('surfaceAlt').color
  const ink = o.filled ? onColor(ctx, accent) : text
  const soft = o.filled ? ink : muted
  const nodes: LayoutNode[] = []
  let y = pad

  const nameStyle: ResolvedTextStyle = { ...ctx.resolveText(t.name), color: ink }
  const nm = placeText(ctx, p.name, nameStyle, { x: pad, y, width: innerW / WRAP }, 'start', { part: `name[${i}]` })
  nodes.push(...nm.nodes)
  y += nm.height + gx

  // Price: one line, shrunk until it fits with the real font's slack.
  const base = ctx.resolveText(t.price(o.count), { letterSpacing: -0.02 })
  let scale = 1
  let priceW = ctx.measureText(p.price, base).width
  const periodStyle: ResolvedTextStyle = { ...ctx.resolveText(t.small), color: soft }
  const periodW = p.period ? ctx.measureText(p.period, periodStyle).width * PRICE_SLACK + sp.sm : 0
  while ((priceW * PRICE_SLACK + periodW) * scale > innerW && scale > 0.4) scale -= 0.05
  const priceFits = (priceW * PRICE_SLACK + periodW) * scale <= innerW
  const priceStyle: ResolvedTextStyle = { ...base, size: base.size * scale, scale, color: ink }
  const pm = ctx.measureText(p.price, priceStyle)
  priceW = pm.width
  nodes.push({ k: 'text', part: `price[${i}]`, box: { x: pad, y, width: Math.max(1, priceW * PRICE_SLACK), height: pm.height }, lines: pm.lines, style: priceStyle })
  if (p.period) {
    const per = ctx.measureText(p.period, periodStyle)
    nodes.push({ k: 'text', part: `period[${i}]`, box: { x: pad + priceW * PRICE_SLACK + sp.sm, y: y + pm.height - per.height - pm.height * 0.12, width: Math.max(1, per.width * PRICE_SLACK), height: per.height }, lines: per.lines, style: periodStyle })
  }
  y += pm.height + gx

  if (o.showDesc && p.description) {
    const ds: ResolvedTextStyle = { ...ctx.resolveText(t.small), color: soft }
    const dm = placeText(ctx, p.description, ds, { x: pad, y, width: innerW / WRAP }, 'start', { part: `description[${i}]` })
    nodes.push(...dm.nodes)
    y += dm.height + sp.sm
  }

  // stretch: the rule and features start at the same height on every card (a plan without a
  // description would otherwise start its list higher than its neighbour)
  const ruleY = y
  if (o.ruleAt !== undefined && o.ruleAt > y) y = o.ruleAt
  if (p.features.length > 0) {
    const rule = o.filled ? tintOf(accent, ink, 0.35) : tintOf(alt, ctx.resolveColor('line').color, 0.9)
    nodes.push({ k: 'rect', part: `rule[${i}]`, box: { x: pad, y, width: innerW, height: 2 }, fill: { type: 'solid', color: rule } })
    y += 2 + sp.sm
    const fs: ResolvedTextStyle = { ...ctx.resolveText(t.small), color: ink }
    const isz = Math.round(fs.size * 1.15)
    const tx = pad + isz + sp.xs
    const tw = Math.max(1, (cardW - pad - tx) / WRAP)
    p.features.forEach((f, j) => {
      const tm = placeText(ctx, f, fs, { x: tx, y, width: tw }, 'start', { part: `feature[${i}].${j}` })
      const rowH = Math.max(tm.height, lineH(fs))
      nodes.push(iconLeaf(o.icon, { x: pad, y: y + (lineH(fs) - isz) / 2, width: isz, height: isz }, o.filled ? ink : accent, `feature[${i}].${j}.icon`))
      nodes.push(...tm.nodes)
      y += rowH + gx
    })
    y -= gx
  }

  let ctaH = 0
  let cta: Content['cta'] = () => []
  if (o.showCta && p.cta) {
    const cs: ResolvedTextStyle = { ...ctx.resolveText(t.small), color: ink }
    const cm = ctx.measureText(p.cta, cs)
    ctaH = Math.round(lineH(cs) + sp.sm * 1.5)
    const fillBtn = p.featured || o.filled
    const btnFill = o.filled ? ctx.resolveColor('surface').color : accent
    const label = fillBtn ? (o.filled ? readableOn(accent, btnFill) : onColor(ctx, accent)) : readableOn(accent, alt)
    cta = (cardH) => {
      const top = cardH - pad - ctaH
      const w = innerW
      const lm = ctx.measureText(p.cta, { ...cs, color: label })
      const lx = pad + Math.max(0, (w - Math.min(lm.width, w)) / 2)
      const rect: LayoutNode = fillBtn
        ? { k: 'rect', part: `cta[${i}]`, box: { x: pad, y: top, width: w, height: ctaH }, fill: { type: 'solid', color: btnFill }, radius: ctaH / 2 }
        : { k: 'rect', part: `cta[${i}]`, box: { x: pad, y: top, width: w, height: ctaH }, stroke: { color: accent, width: 2 }, radius: ctaH / 2 }
      return [rect, { k: 'text', part: `cta[${i}].label`, box: { x: lx, y: top + (ctaH - lm.height) / 2, width: Math.max(1, Math.min(lm.width, w)), height: lm.height }, lines: lm.lines, style: { ...cs, color: label } } as LayoutNode]
    }
    void cm
  }
  return { nodes, bodyH: y, ctaH, cta, pad, ruleY, priceFits }
}

function needed(c: Content, gap: number): number {
  return c.bodyH + (c.ctaH > 0 ? gap + c.ctaH : 0) + c.pad
}

function compute(props: PricingProps, ctx: LayoutContext, W: number, H: number) {
  const plans = readPlans(props)
  if (plans.length === 0) return null
  const sp = ctx.tokens.space
  const n = plans.length
  const gap = sp.md
  const cardW = Math.max(1, (W - gap * (n - 1)) / n)
  const style = enumOf(props.featuredStyle, ['raised', 'outline', 'filled'] as const, 'raised')
  const stretch = props.align !== 'top'
  const showCta = isShown(props, 'showCta')
  const showDesc = isShown(props, 'showDescription')
  const icon = typeof props.checkIcon === 'string' && props.checkIcon ? props.checkIcon : 'check'
  const raise = style === 'raised' && plans.some((p) => p.featured) ? sp.md : 0
  let pick: { contents: Content[]; need: number[]; tier: Tier } | undefined
  for (const tier of TIERS) {
    const build = (ruleAt?: number) => plans.map((p, i) => buildContent(ctx, p, i, cardW, { filled: style === 'filled' && p.featured, showCta, showDesc, icon, count: n, tier, ruleAt }))
    let contents = build()
    if (stretch) contents = build(Math.max(...contents.map((c) => c.ruleY)))
    const need = contents.map((c) => needed(c, sp.md))
    pick = { contents, need, tier }
    if (Math.max(...need) + raise <= H + 1e-6 && contents.every((c) => c.priceFits)) break
  }
  const { contents, tier } = pick!
  // stretch: the cards claim `grow` × their content up front (≤ the box less the raise), so a
  // roomy pricing slide fills its region instead of sitting short and top-heavy
  const tallestNeed = Math.max(...pick!.need)
  const grown = stretch && tier.grow > 1 ? Math.max(tallestNeed, Math.min(H - raise, tallestNeed * tier.grow)) : tallestNeed
  const need = pick!.need.map((v) => (stretch ? Math.max(v, grown) : v))
  return { plans, contents, need, cardW, gap, style, stretch, raise, icon }
}

export function layout(props: PricingProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const r = compute(props, ctx, W, H)
  if (!r) return emptyState(ctx)
  const accent = ctx.resolveColor('accent').color
  const altFill = ctx.resolveColor('surfaceAlt').color
  const tallest = Math.max(...r.need)
  const groups: LayoutNode[] = []

  r.plans.forEach((p, i) => {
    const c = r.contents[i]
    const x = i * (r.cardW + r.gap)
    const lifted = p.featured && r.raise > 0
    // stretch: every card as tall as the tallest content; top: each hugs its own. A lifted
    // (featured, raised) card starts at the top of the block and is taller by `raise`; the others
    // sit `raise` lower, so all bottoms line up and all content starts at the same height.
    const own = r.stretch ? tallest : r.need[i]
    const h = own + (lifted ? r.raise : 0)
    const y = lifted ? 0 : r.raise
    const dy = lifted ? r.raise : 0
    const filled = r.style === 'filled' && p.featured
    const surface = filled ? accent : altFill
    const lcardNodes = flattenChild(
      ctx.layoutChild({ id: `plan-${i}`, type: 'tls.l.card', props: { padding: 'lg', children: [], $block: { style: { surface: { type: 'solid', color: surface } } } } }, { x, y, width: r.cardW, height: h }),
      0,
      0
    )
    const bg = lcardNodes.find((n) => n.k === 'rect') as LayoutNode | undefined
    const card: LayoutNode = bg
      ? { ...bg, part: `card[${i}]`, box: { x, y, width: r.cardW, height: h } }
      : { k: 'rect', part: `card[${i}]`, box: { x, y, width: r.cardW, height: h }, fill: { type: 'solid', color: surface } }
    // AC4: a neutral (not featured-filled) card takes the deck surface (`cardPaint`).
    const cp = filled ? undefined : cardPaint(ctx, { fill: { type: 'solid', color: surface } })
    const nodes: LayoutNode[] = cp && cp.styled ? cardNodes(cp, { x, y, width: r.cardW, height: h }, card.k === 'rect' ? card.radius : undefined, `card[${i}]`) : [card]
    if (p.featured && r.style === 'outline') {
      nodes.push({ k: 'rect', part: `featured[${i}]`, box: { x, y, width: r.cardW, height: h }, stroke: { color: accent, width: 4 } })
    }
    if (lifted) nodes.push({ k: 'rect', part: `featured[${i}]`, box: { x, y, width: r.cardW, height: 8 }, fill: { type: 'solid', color: accent } })
    const shift = (n: LayoutNode): LayoutNode => ({ ...n, box: { ...n.box, x: n.box.x + x, y: n.box.y + y + dy } }) as LayoutNode
    nodes.push(...c.nodes.map(shift), ...c.cta(own).map(shift))
    groups.push({ k: 'group', part: `plan[${i}]`, box: { x: 0, y: 0, width: W, height: H }, children: nodes })
  })
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: groups }
}

export function capacity(props: PricingProps, box: Size, ctx: LayoutContext): CapacityReport {
  const plans = asArr<Record<string, unknown>>(props.plans)
  const maxFeatures = Math.max(0, ...plans.map((p) => asArr(p?.features).length))
  const r = compute(props, ctx, Math.max(1, box.width), Math.max(1, box.height))
  const tall = r ? Math.max(...r.need) + (r.raise > 0 ? r.raise : 0) : 0
  const heightOk = !r || tall <= box.height + 1e-6
  return capacityOf(
    { plans: { max: PRICING_MAX_PLANS, used: plans.length }, features: { max: PRICING_MAX_FEATURES, used: Math.max(1, maxFeatures) } },
    heightOk,
    [{ kind: 'truncate', slot: 'features' }, { kind: 'paginate' }]
  )
}
