/**
 * Pure layout function for tls.l.stack — vertical stack with gap.
 *
 * Distributes child blocks vertically, each spanning the full width,
 * separated by `gap` spacing tokens.
 *
 * V4.1: Supports `sizing` mode (equal|content) for space distribution.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { StackProps } from './schema'

export function layout(props: StackProps, ctx: LayoutContext): LayoutNode {
  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
  const sizingMode: 'equal' | 'content' = (props as { sizing?: 'equal' | 'content' }).sizing ?? 'equal'
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const n = children.length

  // Calculate available height after gaps
  const totalGap = n > 1 ? gap * (n - 1) : 0
  const availableHeight = Math.max(0, H - totalGap)

  // Calculate height per child based on mode
  let childHeight: number
  if (sizingMode === 'equal' || n === 0) {
    // Equal distribution: split available space equally
    childHeight = n > 0 ? availableHeight / n : 0
  } else {
    // Content mode: measure intrinsic heights and use the average or max
    // For now, fall back to equal since proper content-based sizing would
    // need the container to have a natural size
    childHeight = n > 0 ? availableHeight / n : 0
  }

  // Position children
  const childNodes: LayoutNode[] = []
  for (let i = 0; i < n; i++) {
    const childBox = {
      x: 0,
      y: i * (childHeight + gap),
      width: W,
      height: childHeight,
    }
    childNodes.push(ctx.layoutChild(children[i], childBox))
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: childNodes,
  }
}