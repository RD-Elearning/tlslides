/**
 * Pure layout function for tls.l.stack — vertical stack with gap.
 *
 * Distributes child blocks vertically, each spanning the full width,
 * separated by `gap` spacing tokens.
 *
 * Phase 4.2: Supports `sizing` mode (equal|content) for content-based distribution.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { StackProps } from './schema'
import { measureIntrinsicSize } from '../../../layout/layout-child'
import type { BlockRegistry } from '../../../registry'

export function layout(props: StackProps, ctx: LayoutContext): LayoutNode {
  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
  const sizingMode: 'equal' | 'content' = (props as unknown as { sizing?: 'equal' | 'content' }).sizing ?? 'equal'
  const children: BlockSpec[] = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const n = children.length

  // Calculate available height after gaps
  const totalGap = n > 1 ? gap * (n - 1) : 0
  const availableHeight = Math.max(0, H - totalGap)

  // Get registry for intrinsic size measurement (if available via context)
  const registry = (ctx as unknown as { registry?: BlockRegistry }).registry

  // Calculate distributed sizes for each child based on sizing mode
  const sizes: { height: number; y: number }[] = []

  if (sizingMode === 'equal' || n === 0) {
    // Equal distribution
    const childHeight = n > 0 ? availableHeight / n : 0
    for (let i = 0; i < n; i++) {
      sizes.push({
        height: childHeight,
        y: i * (childHeight + gap),
      })
    }
  } else {
    // Content-based distribution: measure intrinsic heights
    const intrinsicSizes: { height: number }[] = []
    
    if (registry && n > 0) {
      for (const child of children) {
        const intrinsic = measureIntrinsicSize(child, ctx, registry)
        intrinsicSizes.push({ height: Math.max(intrinsic.height, 50) }) // minimum 50px
      }
    }

    const totalIntrinsic = intrinsicSizes.reduce((sum, s) => sum + s.height, 0)

    if (totalIntrinsic > 0) {
      // Scale to fill available height
      const scale = availableHeight / totalIntrinsic
      let currentY = 0
      for (let i = 0; i < n; i++) {
        const scaledHeight = intrinsicSizes[i].height * scale
        sizes.push({
          height: scaledHeight,
          y: currentY,
        })
        currentY += scaledHeight + gap
      }
    } else {
      // Fall back to equal
      const childHeight = availableHeight / n
      for (let i = 0; i < n; i++) {
        sizes.push({
          height: childHeight,
          y: i * (childHeight + gap),
        })
      }
    }
  }

  // Position children
  const childNodes: LayoutNode[] = []

  for (let i = 0; i < n; i++) {
    const { y, height } = sizes[i]
    const childBox = {
      x: 0,
      y,
      width: W,
      height,
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