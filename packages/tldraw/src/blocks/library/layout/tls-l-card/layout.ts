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

  return {
    k: 'group',
    box: outerBox,
    part: 'root',
    children: [
      ...background,
      ...childNodes,
    ],
  }
}
