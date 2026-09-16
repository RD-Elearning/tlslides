/**
 * Pure layout function for tls.l.stack — vertical stack with gap.
 *
 * Distributes child blocks vertically, each spanning the full width,
 * separated by `gap` spacing tokens.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { StackProps } from './schema'

export function layout(props: StackProps, ctx: LayoutContext): LayoutNode {
  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const n = children.length

  const totalGap = n > 1 ? gap * (n - 1) : 0
  const childHeight = n > 0 ? Math.max(0, (H - totalGap) / n) : 0

  const childNodes: LayoutNode[] = children.map((child, i) => {
    const childBox = { x: 0, y: i * (childHeight + gap), width: W, height: childHeight }
    return ctx.layoutChild(child, childBox)
  })

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: childNodes,
  }
}
