/**
 * Pure layout function for tls.l.row — horizontal row with gap.
 *
 * Distributes child blocks horizontally, each spanning the full height,
 * separated by `gap` spacing tokens.
 *
 * V4.1: Supports `sizing` mode (equal|content) for space distribution.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { RowProps } from './schema'

export function layout(props: RowProps, ctx: LayoutContext): LayoutNode {
  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
  const sizingMode: 'equal' | 'content' = (props as { sizing?: 'equal' | 'content' }).sizing ?? 'equal'
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const n = children.length

  // Calculate available width after gaps
  const totalGap = n > 1 ? gap * (n - 1) : 0
  const availableWidth = Math.max(0, W - totalGap)

  // Calculate width per child based on mode
  let childWidth: number
  if (sizingMode === 'equal' || n === 0) {
    // Equal distribution: split available space equally
    childWidth = n > 0 ? availableWidth / n : 0
  } else {
    // Content mode: measure intrinsic widths and use
    // For now, fall back to equal since proper content-based sizing would
    // need the container to have a natural size
    childWidth = n > 0 ? availableWidth / n : 0
  }

  // Position children
  const childNodes: LayoutNode[] = []
  for (let i = 0; i < n; i++) {
    const childBox = {
      x: i * (childWidth + gap),
      y: 0,
      width: childWidth,
      height: H,
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