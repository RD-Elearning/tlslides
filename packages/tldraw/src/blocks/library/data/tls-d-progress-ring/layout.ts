/**
 * Pure layout for tls.d.progress-ring — track ring, filled arc, centre value, label and caption.
 *
 * The arc starts at 12 o'clock and runs clockwise. `cap: round` shortens the arc by half a stroke
 * at each end and adds a dot there (the layout has no line-cap field), so the arc still ends where
 * the value says. At or above 100% the ring closes and, above 100%, a `warning` dot at 12 o'clock
 * marks the overflow; the centre text still prints the unclamped figure.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { ProgressRingProps } from './schema'
import { arcPath } from '../_engine/arc-path'
import { chartColors, clamp, dot, enumOf, fmtNum, lineH, mutedStyle, numOrNull, pathNode, root, str, style, textAligned, TEXT_SLACK } from '../_chart/kit'

const THICK = { sm: 0.1, md: 0.16, lg: 0.24 } as const
const FULL = Math.PI * 2 - 1e-4
const TOP = -Math.PI / 2

export function layout(props: ProgressRingProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const c = chartColors(ctx)
  const value = numOrNull(props.value) ?? 0
  const maxRaw = numOrNull(props.max)
  const max = maxRaw !== null && maxRaw > 0 ? maxRaw : 100
  const pct = (value / max) * 100
  const frac = clamp(value / max, 0, 1)
  const label = str(props.label)
  const caption = str(props.caption)
  const sp = ctx.tokens.space
  const labelStyle = style(ctx, 'caption', c.text)
  const capStyle = mutedStyle(ctx, 'footnote')

  // Text under the ring.
  const textNodes: LayoutNode[] = []
  let textH = 0
  const place = (txt: string, s: typeof labelStyle, part: string) => {
    if (!txt) return
    const t = textAligned(ctx, txt, s, { x: 0, y: 0, width: W }, 'center', part)
    t.nodes.forEach((n) => textNodes.push({ ...n, box: { ...n.box, y: n.box.y + textH } } as LayoutNode))
    textH += t.height + sp['3xs']
  }
  place(label, labelStyle, 'label')
  place(caption, capStyle, 'caption')
  if (textH > 0) textH -= sp['3xs']
  const gap = textH > 0 ? sp.xs : 0

  const D = Math.max(1, Math.min(W, H - textH - gap))
  const cx = W / 2
  const cy = D / 2 + Math.max(0, (H - textH - gap - D) / 2)
  const R = D / 2 - 1
  const t = D * THICK[enumOf(props.thickness, ['md', 'sm', 'lg'] as const, 'md')]
  const Ri = Math.max(0, R - t)
  const rm = (R + Ri) / 2

  const color =
    props.tone === 'status' ? ctx.resolveColor(frac < 1 / 3 ? 'negative' : frac < 2 / 3 ? 'warning' : 'positive').color : c.accent

  const nodes: LayoutNode[] = []
  nodes.push(pathNode(ctx, arcPath(cx, cy, R, Ri, TOP, TOP + FULL, FULL), 'track', { fill: c.track }))
  const round = props.cap !== 'flat'
  if (frac > 0) {
    if (frac >= 1) {
      nodes.push(pathNode(ctx, arcPath(cx, cy, R, Ri, TOP, TOP + FULL, FULL), 'arc', { fill: color }))
    } else {
      const span = frac * Math.PI * 2
      const capA = round ? t / 2 / Math.max(1, rm) : 0
      if (round && span > 2 * capA + 0.02) {
        nodes.push(pathNode(ctx, arcPath(cx, cy, R, Ri, TOP + capA, TOP + span - capA, span - 2 * capA), 'arc', { fill: color }))
        nodes.push(dot(cx + rm * Math.cos(TOP + capA), cy + rm * Math.sin(TOP + capA), t / 2, color, 'arc.start'))
        nodes.push(dot(cx + rm * Math.cos(TOP + span - capA), cy + rm * Math.sin(TOP + span - capA), t / 2, color, 'arc.end'))
      } else if (round) {
        // Too short for an arc plus two dots: a single dot at the start.
        nodes.push(dot(cx + rm * Math.cos(TOP + t / 2 / rm), cy + rm * Math.sin(TOP + t / 2 / rm), t / 2, color, 'arc'))
      } else {
        nodes.push(pathNode(ctx, arcPath(cx, cy, R, Ri, TOP, TOP + span, span), 'arc', { fill: color }))
      }
    }
  }
  if (pct > 100.0001) nodes.push(dot(cx, cy - rm, t * 0.32, ctx.resolveColor('warning').color, 'overflow', c.surface))

  // Centre value, scaled down until it sits inside the hole.
  const fmt = enumOf(props.format, ['percent', 'plain', 'compact', 'currency'] as const, 'percent')
  const text = fmt === 'percent' ? `${Math.round(pct)}%` : fmtNum(value, fmt)
  let vs = style(ctx, 'heading', c.text)
  const inner = Math.max(1, Ri * 2 * 0.82)
  for (let k = 0; k < 8; k++) {
    if (ctx.measureText(text, vs).width * TEXT_SLACK <= inner && lineH(vs) <= inner * 0.7) break
    vs = { ...vs, size: vs.size * 0.85 }
  }
  const v = textAligned(ctx, text, vs, { x: cx - inner / 2, y: cy - lineH(vs) / 2, width: inner }, 'center', 'value')
  nodes.push(...v.nodes)

  const yText = cy + D / 2 + gap
  textNodes.forEach((n) => nodes.push({ ...n, box: { ...n.box, y: n.box.y + yText } } as LayoutNode))
  return root(ctx, nodes)
}
