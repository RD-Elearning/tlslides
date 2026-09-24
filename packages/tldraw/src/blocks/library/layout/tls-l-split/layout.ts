/**
 * Pure layout function for tls.l.split — two-panel split with ratio/gutter.
 *
 * Uses `splitBox` to divide the box into two panels, then lays out
 * at most two children (one per panel).
 */

import type { LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { SplitProps } from './schema'
import { splitBox } from '../../../layout/box-model'

export function layout(props: SplitProps, ctx: LayoutContext): LayoutNode {
  const ratio = props.ratio ?? 0.5
  const gutterToken = (props.gutter ?? 'md') as SpaceToken
  const gutter = ctx.tokens.space[gutterToken] ?? ctx.tokens.space.md
  const axis = (props.axis ?? 'x') as 'x' | 'y'
  const children = props.children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const box = { x: 0, y: 0, width: W, height: H }

  const [first, second] = splitBox(box, ratio, gutter, axis)

  const childNodes: LayoutNode[] = []
  if (children.length >= 1) {
    childNodes.push(ctx.layoutChild(children[0], first))
  }
  if (children.length >= 2) {
    childNodes.push(ctx.layoutChild(children[1], second))
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: childNodes,
  }
}
