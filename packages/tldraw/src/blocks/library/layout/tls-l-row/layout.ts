/**
 * Pure layout function for tls.l.row — horizontal row with gap.
 *
 * Distributes child blocks horizontally, each spanning the full height,
 * separated by `gap` spacing tokens.
 *
 * Phase 4.2: Supports `sizing` mode (equal|content) for space distribution.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { RowProps } from './schema'
import { distributeSpace, measureIntrinsicSize } from '../../../layout/layout-child'
import type { BlockRegistry } from '../../../registry'

export function layout(props: RowProps, ctx: LayoutContext): LayoutNode {
  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
  const sizingMode: 'equal' | 'content' = (props as { sizing?: 'equal' | 'content' }).sizing ?? 'equal'
  const children: BlockSpec[] = (props as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const n = children.length

  // Calculate available width after gaps
  const totalGap = n > 1 ? gap * (n - 1) : 0
  const availableWidth = Math.max(0, W - totalGap)

  // Get registry for intrinsic size measurement (if available via context)
  const registry = (ctx as unknown as { registry?: BlockRegistry }).registry

  // Calculate distributed sizes for each child based on sizing mode
  const sizes: { width: number; x: number }[] = []
  
  if (sizingMode === 'equal' || n === 0) {
    // Equal distribution
    const childWidth = n > 0 ? availableWidth / n : 0
    for (let i = 0; i < n; i++) {
      sizes.push({
        width: childWidth,
        x: i * (childWidth + gap),
      })
    }
  } else {
    // Content-based distribution: measure intrinsic widths
    const contextWidth = availableWidth
    const intrinsicSizes: { width: number }[] = []
    
    if (registry && n > 0) {
      for (const child of children) {
        const intrinsic = measureIntrinsicSize(child, ctx, registry)
        intrinsicSizes.push({ width: Math.max(intrinsic.width, 50) }) // minimum 50px
      }
    }
    
    const totalIntrinsic = intrinsicSizes.reduce((sum, s) => sum + s.width, 0)
    
    if (totalIntrinsic > 0) {
      // Scale to fill available space
      const scale = contextWidth / totalIntrinsic
      let currentX = 0
      for (let i = 0; i < n; i++) {
        const scaledWidth = intrinsicSizes[i].width * scale
        sizes.push({
          width: scaledWidth,
          x: currentX,
        })
        currentX += scaledWidth + gap
      }
    } else {
      // Fall back to equal
      const childWidth = availableWidth / n
      for (let i = 0; i < n; i++) {
        sizes.push({
          width: childWidth,
          x: i * (childWidth + gap),
        })
      }
    }
  }

  // Position children
  const childNodes: LayoutNode[] = []
  
  for (let i = 0; i < n; i++) {
    const { x, width } = sizes[i]
    const childBox = {
      x,
      y: 0,
      width,
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