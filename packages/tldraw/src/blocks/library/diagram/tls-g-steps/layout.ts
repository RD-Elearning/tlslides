/**
 * Layout for tls.g.steps — numbered process diagram.
 *
 * Phase 6.1: Arranges steps horizontally or vertically with connectors.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { StepsProps, Step } from './schema'

export function layout(props: StepsProps, ctx: LayoutContext): LayoutNode {
  const steps = props.steps ?? []
  const direction = props.direction ?? 'horizontal'
  const connector = props.connector ?? 'line'
  const W = ctx.box.width
  const H = ctx.box.height

  const stepWidth = 120
  const stepHeight = 80
  const gap = 40

  const positions = calculatePositions(steps, direction, stepWidth, stepHeight, gap)

  const childNodes: LayoutNode[] = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const pos = positions[i]
    const stepBox = {
      x: pos.x,
      y: pos.y,
      width: stepWidth,
      height: stepHeight,
    }

    const children: LayoutNode[] = [
      // Step number (badge) - using a rect as background for the number
      {
        k: 'rect',
        box: { x: 0, y: 0, width: 24, height: 24 },
        part: `step[${i}].number`,
        fill: { type: 'solid', color: ctx.resolveColor('accent').color },
      },
    ]

    // Connector line (if not last)
    if (i < steps.length - 1 && connector !== 'none') {
      const connectorBox = calculateConnectorBox(positions[i], positions[i + 1], direction, stepWidth, stepHeight, gap)
      children.push({
        k: 'line',
        box: connectorBox,
        part: `step[${i}].connector`,
        from: { x: connectorBox.x, y: connectorBox.y },
        to: {
          x: connectorBox.x + connectorBox.width,
          y: connectorBox.y + connectorBox.height,
        },
        stroke: {
          color: ctx.resolveColor('textMuted').color,
          width: 2,
        },
      })
    }

    const node: LayoutNode = {
      k: 'group',
      box: stepBox,
      part: `step[${i}]`,
      children,
    }

    childNodes.push(node)
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: childNodes,
  }
}

function calculatePositions(
  steps: Step[],
  direction: string,
  stepWidth: number,
  stepHeight: number,
  gap: number,
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  let currentX = 0
  let currentY = 0
  let maxRowHeight = stepHeight + gap

  for (let i = 0; i < steps.length; i++) {
    if (direction === 'horizontal') {
      if (i % 4 === 0 && i > 0) {
        // Wrap to next row
        currentX = 0
        currentY += maxRowHeight
        maxRowHeight = stepHeight + gap
      }
      positions.push({ x: currentX, y: currentY })
      currentX += stepWidth + gap
    } else {
      positions.push({ x: 0, y: i * (stepHeight + gap) })
    }
  }

  return positions
}

function calculateConnectorBox(
  from: { x: number; y: number },
  to: { x: number; y: number },
  direction: string,
  stepWidth: number,
  stepHeight: number,
  gap: number,
): { x: number; y: number; width: number; height: number } {
  if (direction === 'horizontal') {
    return {
      x: from.x + stepWidth,
      y: from.y + stepHeight / 2 - 1,
      width: Math.max(0, to.x - from.x - stepWidth),
      height: 2,
    }
  } else {
    return {
      x: from.x + stepWidth / 2 - 1,
      y: from.y + stepHeight,
      width: 2,
      height: Math.max(0, to.y - from.y - stepHeight),
    }
  }
}