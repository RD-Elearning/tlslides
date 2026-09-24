/**
 * Pure layout function for tls.l.card — filled container with padding.
 *
 * Renders a filled background rect covering the full box, then lays out
 * children inside the padded content area. When the instance's `style.surface`
 * is a Paint (gradient), the background rect uses that paint directly.
 */

import type { LayoutContext, LayoutNode, Paint, SpaceToken } from '../../../types'
import type { CardProps } from './schema'
import { insetBox } from '../../../layout/box-model'

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
  if (ctx.style?.surface && typeof ctx.style.surface !== 'string') {
    surfaceFill = ctx.style.surface
  } else {
    const surfaceColor = ctx.resolveColor('surface').color
    surfaceFill = { type: 'solid', color: surfaceColor }
  }

  let childNodes: LayoutNode[]
  if (children.length > 1) {
    // Delegate multi-child stacking to tls.l.stack so each child gets a non-overlapping box.
    childNodes = [ctx.layoutChild({ type: 'tls.l.stack', props: { gap: 'sm', children, sizing: 'content' } }, contentBox)]
  } else {
    childNodes = children.map((child) => ctx.layoutChild(child, contentBox))
  }

  return {
    k: 'group',
    box: outerBox,
    part: 'root',
    children: [
      {
        k: 'rect',
        box: outerBox,
        part: 'background',
        fill: surfaceFill,
      },
      ...childNodes,
    ],
  }
}
