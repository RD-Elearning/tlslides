/**
 * Pure layout function for tls.l.card — filled container with padding.
 *
 * Renders a filled background rect covering the full box, then lays out
 * children inside the padded content area. When the instance's `style.surface`
 * is a Paint (gradient), the background rect uses that paint directly.
 */

import type { LayoutContext, LayoutNode, Paint, SpaceToken } from '../../../types'
import { contextTracks, isAuthoredContext } from '../../../layout/layout-child'
import type { CardProps } from './schema'
import { tagChildren } from '../_motion'
import { insetBox } from '../../../layout/box-model'
import { containerSurface } from '../_style'
import { collectPaintedLeaves, paintedBounds } from '../../../layout/measure-block'
import type { BlockSpec } from '../../../types'

export function layout(props: CardProps, ctx: LayoutContext): LayoutNode {
  const paddingToken = (props.padding ?? 'md') as SpaceToken
  const padding = ctx.tokens.space[paddingToken] ?? ctx.tokens.space.md
  const children = props.children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const outerBox = { x: 0, y: 0, width: W, height: H }
  const contentBox = insetBox(outerBox, padding)

  // Determine the surface fill: use the instance's Paint directly when it's a gradient,
  // otherwise resolve the surface role to a solid color.
  let surfaceFill: Paint
  const explicit = !!(ctx.style?.surface && typeof ctx.style.surface !== 'string')
  if (explicit) {
    surfaceFill = ctx.style!.surface as Paint
  } else {
    const surfaceColor = ctx.resolveColor('surface').color
    surfaceFill = { type: 'solid', color: surfaceColor }
  }
  // AC4: a card with no instance surface takes the deck surface (`cardPaint`); an explicit
  // `style.surface` (a host's or a parent block's paint) wins.
  // AC8: a non-neutral colour-role surface (`'scrim'`, `'accent'`) is an explicit choice too —
  // before AC8 a cover's photo scrim took the deck's glass paint (a light wash under light text on
  // glass-pastel). `surface` / `surfaceAlt` stay the card's base under the deck surface.
  // CMP1: `style.tone` / `radius` / `elevation` restyle the card (`containerSurface`), and the
  // paint the card leaves under its content is passed to the children, so their text solves
  // against the card (a dark or accent card gets light ink), not against the slide.
  const roleSurface = typeof ctx.style?.surface === 'string' && !['surface', 'surfaceAlt'].includes(ctx.style.surface)
  const { nodes: background, surface: under } = containerSurface(ctx, outerBox, surfaceFill, 'background', !(explicit || roleSurface))

  let childNodes: LayoutNode[]
  if (children.length > 1) {
    // Delegate multi-child stacking to tls.l.stack so each child gets a non-overlapping box.
    // CMP1: `style.gap` spaces the card's children (default `sm`).
    // CMP2: and `style.align` places the packed children (top / centre / end).
    const inner = { ...(ctx.style?.gap !== undefined ? { gap: ctx.style.gap } : {}), ...(ctx.style?.align !== undefined ? { align: ctx.style.align } : {}) }
    const gapStyle = Object.keys(inner).length ? { style: inner } : {}
    // CMP4: the shared tracks of a row of peer cards (`peer-tracks.ts`) go to the inner stack
    const tracks = contextTracks(ctx)
    childNodes = [ctx.layoutChild({ id: '$stack', type: 'tls.l.stack', props: { gap: 'sm', children, sizing: 'content', ...(isAuthoredContext(ctx) ? { pack: true } : {}), ...(tracks ? { tracks } : {}) }, ...gapStyle }, contentBox, { surface: under })]
  } else {
    childNodes = tagChildren(children.map((child) => ctx.layoutChild(child, contentBox, { surface: under })))
  }

  // CMP4: an authored card of content-sized children (text, atoms) is as tall as what its packed
  // children paint plus its padding, not as tall as the cell it was given: a row of cards no
  // longer paints three quarters empty, it has a natural height and its region places it. Peer
  // cards of one structure share their tracks, so they come out the same height. A composite's
  // card, a card with `style.align`, a chart or a photo inside, or content that fills the box
  // keep the full box.
  const hug = hugBottom(ctx, children, childNodes, contentBox, padding)
  const bg = hug !== undefined ? containerSurface(ctx, { x: 0, y: 0, width: W, height: hug }, surfaceFill, 'background', !(explicit || roleSurface)).nodes : background

  return {
    k: 'group',
    box: outerBox,
    part: 'root',
    children: [
      ...bg,
      ...childNodes,
    ],
  }
}

/** Children that fill their box (a chart, a photo, a nested grid): a card holding one keeps its box. */
const FILLS = /^tls\.(d\.|m\.(image|decoration|pattern|image-grid|device-mock|logo-wall)$|l\.(grid|row|split|overlay|field|repeater)$)/

/** The card height that hugs its laid-out content, or `undefined` to keep the box (see above). */
function hugBottom(ctx: LayoutContext, children: BlockSpec[], nodes: LayoutNode[], content: { y: number; height: number }, padding: number): number | undefined {
  if (!isAuthoredContext(ctx) || !children.length || ctx.style?.align !== undefined) return undefined
  if (children.some((c) => !c || typeof c.type !== 'string' || FILLS.test(c.type))) return undefined
  let end: number | undefined
  if (children.length > 1) {
    // the inner stack's slots (peer tracks included), so peer cards end on one line whatever
    // their last child paints: wrapper → stack root → one wrapper group per child
    const root = nodes[0]?.k === 'group' ? nodes[0].children?.[0] : undefined
    const slots = root?.k === 'group' ? root.children ?? [] : []
    if (slots.length) end = content.y + Math.max(...slots.map((n) => n.box.y + n.box.height))
  } else {
    const size = { width: ctx.box.width, height: ctx.box.height }
    const b = paintedBounds(collectPaintedLeaves({ k: 'group', box: { x: 0, y: 0, ...size }, children: nodes }, size))
    if (b) end = b.y + b.height
  }
  if (end === undefined) return undefined
  const bottom = Math.ceil(end + padding)
  // content that reaches the box's padding edge fills it: keep the box
  return bottom < content.y + content.height + padding - 1 ? bottom : undefined
}


