/**
 * Pure layout for tls.d.trend-badge — [pill: arrow + signed value] [optional label].
 *
 * The pill is tinted with the positive / negative / neutral role chosen by the sign and the
 * polarity, and its text is solved against that tint. The arrow is a path (a glyph would depend on
 * the font); a zero change draws a flat dash. The block is left-aligned and vertically centred.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import type { TrendBadgeProps } from './schema'
import { chartColors, enumOf, fmtSigned, lineH, mutedStyle, numOrNull, oneLine, pathNode, readableOn, root, solidRect, str, style, textAligned, tintOf, TEXT_SLACK } from '../_chart/kit'

const TOKEN: Record<string, TypeToken> = { sm: 'footnote', md: 'caption', lg: 'body' }

export function layout(props: TrendBadgeProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const c = chartColors(ctx)
  const delta = numOrNull(props.delta) ?? 0
  const polarity = enumOf(props.polarity, ['upGood', 'downGood', 'neutral'] as const, 'upGood')
  const size = enumOf(props.size, ['md', 'sm', 'lg'] as const, 'md')
  const good = delta === 0 || polarity === 'neutral' ? null : polarity === 'upGood' ? delta > 0 : delta < 0
  const base = ctx.resolveColor(good === null ? 'neutral' : good ? 'positive' : 'negative').color
  const fill = tintOf(c.surface, base, 0.2)
  const ink = readableOn(base, fill)
  let ts = { ...style(ctx, TOKEN[size]), color: ink }
  // A box shorter than the pill shrinks the type until the pill fits (never overflows its box).
  for (let k = 0; k < 8 && lineH(ts) * 1.56 > H; k++) ts = { ...ts, size: ts.size * 0.85 }
  const lh = lineH(ts)
  const txt = fmtSigned(delta, props.format === 'percent' ? undefined : props.format) + (props.format === 'percent' ? '%' : '')
  const tw = Math.ceil(ctx.measureText(txt, ts).width * 1.12) + 2
  const padX = Math.round(ts.size * 0.6)
  const padY = Math.round(ts.size * 0.28)
  const aw = ts.size * 0.62
  const gap = ts.size * 0.35
  const pillH = lh + 2 * padY
  const pillW = Math.min(W, padX + aw + gap + tw + padX)
  const y = Math.max(0, (H - pillH) / 2)
  const nodes: LayoutNode[] = []
  nodes.push(solidRect({ x: 0, y, width: pillW, height: pillH }, fill, 'badge', pillH / 2))
  // Arrow: triangle up for a rise, down for a fall, dash for no change.
  const ax = padX
  const ay = y + pillH / 2
  const ah = aw * 0.8
  if (delta > 0) nodes.push(pathNode(ctx, `M${ax} ${ay + ah / 2}L${ax + aw} ${ay + ah / 2}L${ax + aw / 2} ${ay - ah / 2}Z`, 'badge.arrow', { fill: ink }))
  else if (delta < 0) nodes.push(pathNode(ctx, `M${ax} ${ay - ah / 2}L${ax + aw} ${ay - ah / 2}L${ax + aw / 2} ${ay + ah / 2}Z`, 'badge.arrow', { fill: ink }))
  else nodes.push(solidRect({ x: ax, y: ay - 1.5, width: aw, height: 3 }, ink, 'badge.arrow'))
  nodes.push(...textAligned(ctx, txt, ts, { x: padX + aw + gap, y: y + padY, width: tw }, 'start', 'badge.text').nodes.slice(0, 1))
  const label = str(props.label)
  if (label && pillW < W) {
    const ls = mutedStyle(ctx, TOKEN[size])
    const lx = pillW + ctx.tokens.space.xs
    const avail = W - lx
    if (avail > 20) nodes.push(oneLine(ctx, label, ls, { x: lx, y: y + (pillH - lineH(ls)) / 2, width: Math.min(avail, Math.ceil(ctx.measureText(label, ls).width * TEXT_SLACK)) }, 'badge.label'))
  }
  return root(ctx, nodes)
}
