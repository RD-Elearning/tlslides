/**
 * Pure layout function for tls.l.row — horizontal row with gap.
 *
 * Distributes child blocks horizontally, each spanning the full height,
 * separated by `gap` spacing tokens.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { RowProps } from './schema'

export function layout(props: RowProps, ctx: LayoutContext): LayoutNode {
  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const n = children.length

  const totalGap = n > 1 ? gap * (n - 1) : 0
  const childWidth = n > 0 ? Math.max(0, (W - totalGap) / n) : 0

  const childNodes: LayoutNode[] = children.map((child, i) => {
    const childBox = { x: i * (childWidth + gap), y: 0, width: childWidth, height: H }
    return ctx.layoutChild(child, childBox)
  })

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: childNodes,
  }
}
