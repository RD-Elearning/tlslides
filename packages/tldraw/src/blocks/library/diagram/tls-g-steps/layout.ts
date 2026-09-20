/**
 * Layout for tls.g.steps — numbered process diagram.
 *
 * Phase 6.1: Arranges steps horizontally or vertically with connectors.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { StepsProps, Step } from './schema'
import { iconHtml } from '../../../icons'

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
  const titleHeight = 24
  const descHeight = 16

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const pos = positions[i]
    const stepBox = {
      x: pos.x,
      y: pos.y,
      width: stepWidth,
      height: stepHeight,
    }

    const node: LayoutNode = {
      k: 'group',
      box: stepBox,
      part: `step[${i}]`,
      children: [
        // Step number (circle)
        {
          k: 'shape',
          box: { x: 0, y: 0, width: 24, height: 24 },
          part: `step[${i}].number`,
          path: `M12 2L2 12l10 10 10-10-10-10zm0 1.8L9 12H5v2h4l-3 3h2l3-3v4h2V9H9V7l3-3z`,
          fill: ctx.resolveColor('accent').color,
        },
        // Connector line (if not last)
        ...(i < steps.length - 1 && connector !== 'none'
          ? [
              {
                k: 'line',
                box: calculateConnectorBox(positions[i], positions[i + 1], direction, stepWidth, stepHeight, gap),
                part: `step[${i}].connector`,
                style: {
                  stroke: ctx.resolveColor('textMuted').color,
                  strokeWidth: 2,
                },
              },
            ]
          : []),
        // Title text
        {
          k: 'text',
          box: { x: 0, y: stepHeight + 4, width: stepWidth, height: titleHeight },
          part: `step[${i}].title`,
          text: {
            text: step.title,
            fontSize: 16,
            fontFamily: ctx.tokens.fontFamily ?? '"Source Sans Pro", sans-serif',
            color: ctx.resolveColor('on').color,
          },
        },
      ],
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
  gap: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  const startX = 0
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
  gap: number
): { x: number; y: number; width: number; height: number } {
  if (direction === 'horizontal') {
    return {
      x: from.x + stepWidth,
      y: from.y + stepHeight / 2 - 1,
      width: to.x - from.x - stepWidth,
      height: 2,
    }
  } else {
    return {
      x: from.x + stepWidth / 2 - 1,
      y: from.y + stepHeight,
      width: 2,
      height: to.y - from.y - stepHeight,
    }
  }
}