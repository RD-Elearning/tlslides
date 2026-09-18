/**
 * Pure layout function for tls.l.footer — content + footer.
 *
 * Splits the box vertically: the top area holds main content, and
 * the bottom area holds the footer, separated by a gutter.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { FooterProps } from './schema'
import { splitBox } from '../../../layout/box-model'

export function layout(props: FooterProps, ctx: LayoutContext): LayoutNode {
  const footerHeight = props.footerHeight ?? 120
  const gutterToken = (props.gutter ?? 'md') as SpaceToken
  const gutter = ctx.tokens.space[gutterToken] ?? ctx.tokens.space.md
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const box = { x: 0, y: 0, width: W, height: H }

  // Calculate ratio: footer fraction of total height
  const ratio = H > 0 ? Math.min(0.9, Math.max(0.1, 1 - footerHeight / H)) : 0.8
  const [mainBox, footerBox] = splitBox(box, ratio, gutter, 'y')

  const mainChild = children.length >= 1 ? children[0] : null
  const footerChild = children.length >= 2 ? children[1] : null

  const childNodes: LayoutNode[] = []
  if (mainChild) childNodes.push(ctx.layoutChild(mainChild, mainBox))
  if (footerChild) childNodes.push(ctx.layoutChild(footerChild, footerBox))

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: childNodes,
  }
}
