/**
 * Pure layout function for tls.l.overlay — layered children (z-stacked).
 *
 * Every child fills the full box, layered in document order (last child on top).
 */

import type { BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import type { OverlayProps } from './schema'

export function layout(_props: OverlayProps, ctx: LayoutContext): LayoutNode {
  const children = (_props as unknown as { children?: BlockSpec[] }).children ?? []
  const W = ctx.box.width
  const H = ctx.box.height
  const fullBox = { x: 0, y: 0, width: W, height: H }

  const childNodes: LayoutNode[] = children.map((child) => {
    return ctx.layoutChild(child, fullBox)
  })

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    clip: true,
    children: childNodes,
  }
}
