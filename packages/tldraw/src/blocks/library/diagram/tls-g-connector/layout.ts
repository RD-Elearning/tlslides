/**
 * Pure layout for tls.g.connector — one slide connector (CMP3, SURVEY B2): the route from
 * `fromBox` to `toBox` (`connectorRoute`), stealth arrowheads, an optional label on a pill.
 *
 * Paint: `line` (recessive; the line role solved to 3:1 on what is behind, so it never vanishes),
 * `accent`, or `text`. Weight hairline 2 / md 3 / bold 5. A dashed connector carries
 * `Stroke.dash` = [4w, 2w] (the P14 "8,4" flow dash at w = 2). The label is caption type in the
 * muted text colour on a pill of the surface behind, centred on the route's midpoint, so the line
 * never strikes through it.
 *
 * Parts: `line` (path), `head` / `head-start` (filled paths), `label` (group). Pure and DOM-free.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { ConnectorProps } from './schema'
import { connectorRoute, CONNECTOR_WEIGHT } from '../../../layout/connector-route'
import { behindColor } from '../../text/_engine/atom'
import { readableOn } from '../../text/_engine/color'
import { withRealWidths } from '../../data/_chart/kit'

const isBox = (b: unknown): b is { x: number; y: number; width: number; height: number } =>
  !!b && typeof b === 'object' && ['x', 'y', 'width', 'height'].every((k) => typeof (b as any)[k] === 'number' && Number.isFinite((b as any)[k]))

/** The connector's stroke colour for a tone, readable (3:1) on the surface behind it. */
export function connectorColor(ctx: LayoutContext, tone: unknown): string {
  const behind = behindColor(ctx)
  const role = tone === 'accent' ? 'accent' : tone === 'text' ? 'text' : 'line'
  return readableOn(ctx.resolveColor(role).color, behind, 3)
}

export function layout(props: ConnectorProps, ctx0: LayoutContext): LayoutNode {
  const ctx = withRealWidths(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const root = (children: LayoutNode[]): LayoutNode => ({ k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children })
  if (!isBox(props.fromBox) || !isBox(props.toBox)) return root([])
  const weight = props.weight === 'hairline' || props.weight === 'bold' ? props.weight : 'md'
  const w = CONNECTOR_WEIGHT[weight]
  const g = connectorRoute({
    from: { box: props.fromBox, side: props.from?.side, round: props.fromRound === true },
    to: { box: props.toBox, side: props.to?.side, round: props.toRound === true },
    route: props.route,
    head: props.head,
    width: w,
  })
  const color = connectorColor(ctx, props.tone)
  const full = { x: 0, y: 0, width: W, height: H }
  const nodes: LayoutNode[] = []
  if (g.d) {
    nodes.push({
      k: 'path',
      part: 'line',
      box: full,
      d: g.d,
      stroke: { color, width: w, ...(props.dash === true ? { dash: [4 * w, 2 * w] } : {}) },
    })
  }
  if (g.heads.start) nodes.push({ k: 'path', part: 'head-start', box: full, d: g.heads.start.d, fill: { type: 'solid', color } })
  if (g.heads.end) nodes.push({ k: 'path', part: 'head', box: full, d: g.heads.end.d, fill: { type: 'solid', color } })
  const label = typeof props.label === 'string' ? props.label.trim().slice(0, 40) : ''
  if (label) {
    const behind = behindColor(ctx)
    const style = { ...ctx.resolveText('caption'), color: readableOn(ctx.resolveColor('textMuted').color, behind) }
    const m = ctx.measureText(label, style)
    const tw = Math.ceil(m.width)
    const th = style.size * style.lineHeight
    const padX = Math.round(style.size * 0.55)
    const padY = Math.round(style.size * 0.15)
    const lw = tw + 2 * padX
    const lh = Math.round(th + 2 * padY)
    const x = Math.max(0, Math.min(W - lw, g.mid.x - lw / 2))
    const y = Math.max(0, Math.min(H - lh, g.mid.y - lh / 2))
    nodes.push({
      k: 'group',
      part: 'label',
      box: { x, y, width: lw, height: lh },
      children: [
        { k: 'rect', part: 'label.pill', box: { x: 0, y: 0, width: lw, height: lh }, fill: { type: 'solid', color: behind }, radius: lh / 2 },
        { k: 'text', part: 'label.text', box: { x: padX, y: padY, width: tw, height: th }, lines: m.lines.slice(0, 1), style, propPath: 'label' },
      ],
    })
  }
  return root(nodes)
}
