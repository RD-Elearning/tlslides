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
import { iconLeaf } from '../../text/_engine/icon'
import { placeText } from '../../text/_engine/text-place'

/** Measured text is up to ~35% narrower than the real font; wrap a little early. */
const WRAP = 1.12

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

interface Content {
  nodes: LayoutNode[]
  /** Height of everything above the button (and the button's own height when present). */
  bodyH: number
  ctaH: number
  /** Re-place the button at the card bottom: returns its nodes for a given card height. */
  cta: (cardH: number) => LayoutNode[]
}

/** The card's content, relative to the card's top-left corner. */
function buildContent(ctx: LayoutContext, p: Plan, i: number, cardW: number, o: { filled: boolean; showCta: boolean; showDesc: boolean; icon: string; count: number }): Content {
  const sp = ctx.tokens.space
  const pad = sp.lg
  const innerW = Math.max(1, cardW - pad * 2)
  const accent = ctx.resolveColor('accent').color
  const text = ctx.resolveColor('text').color
  const muted = ctx.resolveColor('textMuted').color
  const alt = ctx.resolveColor('surfaceAlt').color
  const ink = o.filled ? onColor(ctx, accent) : text
  const soft = o.filled ? ink : muted
  const nodes: LayoutNode[] = []
  let y = pad

  const nameStyle: ResolvedTextStyle = { ...ctx.resolveText('lead'), color: ink }
  const nm = placeText(ctx, p.name, nameStyle, { x: pad, y, width: innerW / WRAP }, 'start', { part: `name[${i}]` })
  nodes.push(...nm.nodes)
  y += nm.height + sp.xs

  // Price: one line, shrunk until it fits with the real font's slack.
  const base = ctx.resolveText(o.count >= 4 ? 'heading' : 'title', { letterSpacing: -0.02 })
  let scale = 1
  let priceW = ctx.measureText(p.price, base).width
  const periodStyle: ResolvedTextStyle = { ...ctx.resolveText('caption'), color: soft }
  const periodW = p.period ? ctx.measureText(p.period, periodStyle).width * 1.2 + sp.xs : 0
  while ((priceW * 1.2 + periodW) * scale > innerW && scale > 0.4) scale -= 0.05
  const priceStyle: ResolvedTextStyle = { ...base, size: base.size * scale, scale, color: ink }
  const pm = ctx.measureText(p.price, priceStyle)
  priceW = pm.width
  nodes.push({ k: 'text', part: `price[${i}]`, box: { x: pad, y, width: Math.max(1, priceW * 1.2), height: pm.height }, lines: pm.lines, style: priceStyle })
  if (p.period) {
    const per = ctx.measureText(p.period, periodStyle)
    nodes.push({ k: 'text', part: `period[${i}]`, box: { x: pad + priceW * 1.2 + sp.xs, y: y + pm.height - per.height - pm.height * 0.12, width: Math.max(1, per.width * 1.2), height: per.height }, lines: per.lines, style: periodStyle })
  }
  y += pm.height + sp.xs

  if (o.showDesc && p.description) {
    const ds: ResolvedTextStyle = { ...ctx.resolveText('caption'), color: soft }
    const dm = placeText(ctx, p.description, ds, { x: pad, y, width: innerW / WRAP }, 'start', { part: `description[${i}]` })
    nodes.push(...dm.nodes)
    y += dm.height + sp.sm
  }

  if (p.features.length > 0) {
    const rule = o.filled ? tintOf(accent, ink, 0.35) : tintOf(alt, ctx.resolveColor('line').color, 0.9)
    nodes.push({ k: 'rect', part: `rule[${i}]`, box: { x: pad, y, width: innerW, height: 2 }, fill: { type: 'solid', color: rule } })
    y += 2 + sp.sm
    const fs: ResolvedTextStyle = { ...ctx.resolveText('caption'), color: ink }
    const isz = Math.round(fs.size * 1.15)
    const tx = pad + isz + sp.xs
    const tw = Math.max(1, (cardW - pad - tx) / WRAP)
    p.features.forEach((f, j) => {
      const tm = placeText(ctx, f, fs, { x: tx, y, width: tw }, 'start', { part: `feature[${i}].${j}` })
      const rowH = Math.max(tm.height, lineH(fs))
      nodes.push(iconLeaf(o.icon, { x: pad, y: y + (lineH(fs) - isz) / 2, width: isz, height: isz }, o.filled ? ink : accent, `feature[${i}].${j}.icon`))
      nodes.push(...tm.nodes)
      y += rowH + sp.xs
    })
    y -= sp.xs
  }

  let ctaH = 0
  let cta: Content['cta'] = () => []
  if (o.showCta && p.cta) {
    const cs: ResolvedTextStyle = { ...ctx.resolveText('caption'), color: ink }
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
  return { nodes, bodyH: y, ctaH, cta }
}

function needed(c: Content, pad: number, gap: number): number {
  return c.bodyH + (c.ctaH > 0 ? gap + c.ctaH : 0) + pad
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
  const contents = plans.map((p, i) => buildContent(ctx, p, i, cardW, { filled: style === 'filled' && p.featured, showCta, showDesc, icon, count: n }))
  const need = contents.map((c) => needed(c, sp.lg, sp.md))
  const raise = style === 'raised' && plans.some((p) => p.featured) ? sp.md : 0
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
    const cardNodes = flattenChild(
      ctx.layoutChild({ id: `plan-${i}`, type: 'tls.l.card', props: { padding: 'lg', children: [], $block: { style: { surface: { type: 'solid', color: surface } } } } }, { x, y, width: r.cardW, height: h }),
      0,
      0
    )
    const bg = cardNodes.find((n) => n.k === 'rect') as LayoutNode | undefined
    const card: LayoutNode = bg
      ? { ...bg, part: `card[${i}]`, box: { x, y, width: r.cardW, height: h } }
      : { k: 'rect', part: `card[${i}]`, box: { x, y, width: r.cardW, height: h }, fill: { type: 'solid', color: surface } }
    const nodes: LayoutNode[] = [card]
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
