/**
 * Pure layout function for tls.l.card — filled container with padding.
 *
 * Renders a filled background rect covering the full box, then lays out
 * children inside the padded content area. When the instance's `style.surface`
 * is a Paint (gradient), the background rect uses that paint directly.
 */

import type { LayoutContext, LayoutNode, Paint, SpaceToken } from '../../../types'
import type { CardProps } from './schema'
import { tagChildren } from '../_motion'
import { insetBox } from '../../../layout/box-model'
import { cardNodes, cardPaint } from '../../composite/_kit'

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
  const roleSurface = typeof ctx.style?.surface === 'string' && !['surface', 'surfaceAlt'].includes(ctx.style.surface)
  const cp = explicit || roleSurface ? undefined : cardPaint(ctx, { fill: surfaceFill })
  const background: LayoutNode[] =
    cp && cp.styled
      ? cardNodes(cp, outerBox, ctx.tokens.radius.md, 'background')
      : [{ k: 'rect', box: outerBox, part: 'background', fill: surfaceFill }]

  let childNodes: LayoutNode[]
  if (children.length > 1) {
    // Delegate multi-child stacking to tls.l.stack so each child gets a non-overlapping box.
    childNodes = [ctx.layoutChild({ id: '$stack', type: 'tls.l.stack', props: { gap: 'sm', children, sizing: 'content' } }, contentBox)]
  } else {
    childNodes = tagChildren(children.map((child) => ctx.layoutChild(child, contentBox)))
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
