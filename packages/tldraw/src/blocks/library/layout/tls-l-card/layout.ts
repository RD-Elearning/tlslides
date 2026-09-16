/**
 * Pure layout function for tls.l.card — filled container with padding.
 *
 * Renders a filled background rect covering the full box, then lays out
 * children inside the padded content area.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { CardProps } from './schema'
import { insetBox } from '../../../layout/box-model'

export function layout(props: CardProps, ctx: LayoutContext): LayoutNode {
  const paddingToken = (props.padding ?? 'md') as SpaceToken
  const padding = ctx.tokens.space[paddingToken] ?? ctx.tokens.space.md
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const outerBox = { x: 0, y: 0, width: W, height: H }
  const contentBox = insetBox(outerBox, padding)

  const surfaceColor = ctx.resolveColor('surface').color

  const childNodes: LayoutNode[] = children.map((child) => {
    return ctx.layoutChild(child, contentBox)
  })

  return {
    k: 'group',
    box: outerBox,
    part: 'root',
    children: [
      {
        k: 'rect',
        box: outerBox,
        part: 'background',
        fill: { type: 'solid', color: surfaceColor },
      },
      ...childNodes,
    ],
  }
}
