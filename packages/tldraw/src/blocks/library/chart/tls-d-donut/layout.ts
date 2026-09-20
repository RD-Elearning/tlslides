/**
 * Layout for tls.d.donut — donut chart with slice visualization.
 *
 * Phase 6.1: Simple donut chart rendering with color roles.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { DonutProps } from './schema'

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

    // Calculate arc path
    const x1 = centerX + radius * Math.cos(currentAngle)
    const y1 = centerY + radius * Math.sin(currentAngle)
    const x2 = centerX + radius * Math.cos(endAngle)
    const y2 = centerY + radius * Math.sin(endAngle)

    const largeArc = sliceAngle > Math.PI ? 1 : 0
    const cosEnd = Math.cos(endAngle)
    const sinEnd = Math.sin(endAngle)
    const cosCurrent = Math.cos(currentAngle)
    const sinCurrent = Math.sin(currentAngle)

    const outerPath = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    const innerPath = `M ${centerX} ${centerY} L ${centerX + innerRadius * cosCurrent} ${centerY + innerRadius * sinCurrent} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${centerX + innerRadius * cosEnd} ${centerY + innerRadius * sinEnd} Z`

    const fillColor = ctx.resolveColor(slice.color ?? 'accent').color

    sliceNodes.push({
      k: 'shape',
      box: { x: 0, y: 0, width: W, height: H },
      part: `slice[${i}]`,
      path: `${outerPath} ${innerPath}`,
      fill: fillColor,
    })

    currentAngle = endAngle
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    children: sliceNodes,
  }
}