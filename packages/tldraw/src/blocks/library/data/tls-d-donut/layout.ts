/**
 * Layout for tls.d.donut — donut chart with slice visualization.
 *
 * Phase 6.1: Simple donut chart rendering with color roles.
 */

import type { LayoutContext, LayoutNode, Paint } from '../../../types'
import type { DonutProps } from './schema'
import { arcPath } from '../_engine/arc-path'

export function layout(props: DonutProps, ctx: LayoutContext): LayoutNode {
  const slices = props.slices ?? []
  const total = props.total ?? 100
  const W = ctx.box.width
  const H = ctx.box.height

  const radius = Math.min(W, H) / 2 - 10
  const centerX = W / 2
  const centerY = H / 2
  const innerRadius = radius * 0.4

  const sliceNodes: LayoutNode[] = []

  let currentAngle = 0

  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i]
    const sliceAngle = (slice.value / total) * Math.PI * 2
    const endAngle = currentAngle + sliceAngle

    const d = arcPath(centerX, centerY, radius, innerRadius, currentAngle, endAngle, sliceAngle)

    const fillPaint: Paint = { type: 'solid', color: ctx.resolveColor(slice.color ?? 'accent').color }

    const pathNode: LayoutNode = {
      k: 'path',
      box: { x: 0, y: 0, width: W, height: H },
      part: `slice[${i}]`,
      d,
      fill: fillPaint,
    }
    
    sliceNodes.push(pathNode)

    currentAngle = endAngle
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    children: sliceNodes,
  }
}