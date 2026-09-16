/**
 * Pure layout function for tls.l.sidebar — sidebar + main content.
 *
 * Splits the box into a sidebar of fixed width and a main content area,
 * with a gutter between them. The sidebar can be on the start (left) or
 * end (right) side.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { SidebarProps } from './schema'
import { splitBox } from '../../../layout/box-model'

export function layout(props: SidebarProps, ctx: LayoutContext): LayoutNode {
  const sidebarWidth = props.sidebarWidth ?? 320
  const gutterToken = (props.gutter ?? 'md') as SpaceToken
  const gutter = ctx.tokens.space[gutterToken] ?? ctx.tokens.space.md
  const side = props.sidebarSide ?? 'start'
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const box = { x: 0, y: 0, width: W, height: H }

  // Calculate the ratio for the sidebar
  const ratio = W > 0 ? Math.min(0.9, Math.max(0.1, sidebarWidth / W)) : 0.3
  const [sidebarBox, mainBox] = splitBox(box, ratio, gutter, 'x')

  const sidebarChild = children.length >= 1 ? children[0] : null
  const mainChild = children.length >= 2 ? children[1] : null

  const childNodes: LayoutNode[] = []
  if (side === 'start') {
    if (sidebarChild) childNodes.push(ctx.layoutChild(sidebarChild, sidebarBox))
    if (mainChild) childNodes.push(ctx.layoutChild(mainChild, mainBox))
  } else {
    // End: swap — the first split piece is the sidebar but it should appear on the right
    if (mainChild) childNodes.push(ctx.layoutChild(mainChild, sidebarBox))
    if (sidebarChild) childNodes.push(ctx.layoutChild(sidebarChild, mainBox))
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: childNodes,
  }
}
