/**
 * Layout for tls.g.steps — numbered process diagram.
 *
 * Each step is a numbered badge (a filled circle with the step index) followed by its
 * title and, if given, a muted description — previously the badge rendered alone, with
 * no title or description at all. Connectors between consecutive badges are drawn as
 * thin filled rects, not `k:'line'` nodes: `tls.c.steps` (the composite family's own
 * steps block) already learned this lesson — a horizontal line's box height and its SVG
 * endpoint geometry disagree, so a rect is what keeps DOM/SVG parity by construction.
 *
 * Column width is derived from the box actually given (`ctx.box.width`), up to 4 columns
 * per row before wrapping — not a fixed absolute pixel width, so the diagram resizes with
 * its container instead of overflowing or floating in unused space.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { StepsProps } from './schema'
import { alignVertically } from '../../../layout/vertical-align'

const BADGE_SIZE = 32
const BADGE_GAP = 12
const MAX_COLS = 4
const CONNECTOR_THICKNESS = 2

export function layout(props: StepsProps, ctx: LayoutContext): LayoutNode {
  const steps = props.steps ?? []
  const direction = props.direction ?? 'horizontal'
  const connector = props.connector ?? 'line'
  const W = ctx.box.width
  const H = ctx.box.height
  const gap = ctx.tokens.space.lg

  if (steps.length === 0) {
    return { k: 'group', box: { x: 0, y: 0, width: W, height: 0 }, part: 'root', children: [] }
  }

  const cols = direction === 'horizontal' ? Math.min(MAX_COLS, steps.length) : 1
  const stepWidth =
    direction === 'horizontal'
      ? Math.max(80, (W - (cols - 1) * gap) / cols)
      : W

  const titleStyle = ctx.resolveText('body')
  const titleColor = ctx.resolveColor('text').color
  const descStyle = ctx.resolveText('caption')
  const descColor = ctx.resolveColor('textMuted').color
  const numberStyle = ctx.resolveText('caption')
  const numberColor = ctx.resolveColor('surface').color
  const badgeColor = ctx.resolveColor('accent').color
  const connectorColor = ctx.resolveColor('textMuted').color

  const measured = steps.map((step) => {
    const titleMetrics = ctx.measureText(step.title ?? '', titleStyle, stepWidth)
    const descMetrics = step.description
      ? ctx.measureText(step.description, descStyle, stepWidth)
      : undefined
    const contentHeight =
      BADGE_SIZE +
      BADGE_GAP +
      titleMetrics.height +
      (descMetrics ? ctx.tokens.space.xs + descMetrics.height : 0)
    return { titleMetrics, descMetrics, contentHeight }
  })

  const stepHeight = Math.max(BADGE_SIZE, ...measured.map((m) => m.contentHeight))

  const positions = calculatePositions(steps.length, direction, cols, stepWidth, stepHeight, gap)

  const children: LayoutNode[] = []

  for (let i = 0; i < steps.length; i++) {
    const pos = positions[i]
    const { titleMetrics, descMetrics } = measured[i]
    const stepBox = { x: pos.x, y: pos.y, width: stepWidth, height: stepHeight }

    const numberMetrics = ctx.measureText(String(i + 1), numberStyle, BADGE_SIZE)
    const numberLines = alignVertically(numberMetrics.lines, BADGE_SIZE, 'center')
    const numberX = Math.max(0, (BADGE_SIZE - numberMetrics.width) / 2)

    const stepChildren: LayoutNode[] = [
      // Step number badge — a filled circle.
      {
        k: 'rect',
        box: { x: 0, y: 0, width: BADGE_SIZE, height: BADGE_SIZE },
        part: `step[${i}].badge`,
        fill: { type: 'solid', color: badgeColor },
        radius: BADGE_SIZE / 2,
      },
      // The step's own index, centred in the badge.
      {
        k: 'text',
        box: { x: numberX, y: 0, width: numberMetrics.width, height: BADGE_SIZE },
        part: `step[${i}].number`,
        lines: numberLines,
        style: { ...numberStyle, color: numberColor },
      },
      // Title.
      {
        k: 'text',
        box: { x: 0, y: BADGE_SIZE + BADGE_GAP, width: stepWidth, height: titleMetrics.height },
        part: `step[${i}].title`,
        lines: titleMetrics.lines,
        style: { ...titleStyle, color: titleColor },
        propPath: `steps.${i}.title`,
      },
    ]

    if (descMetrics) {
      stepChildren.push({
        k: 'text',
        box: {
          x: 0,
          y: BADGE_SIZE + BADGE_GAP + titleMetrics.height + ctx.tokens.space.xs,
          width: stepWidth,
          height: descMetrics.height,
        },
        part: `step[${i}].description`,
        lines: descMetrics.lines,
        style: { ...descStyle, color: descColor },
        propPath: `steps.${i}.description`,
      })
    }

    children.push({ k: 'group', box: stepBox, part: `step[${i}]`, children: stepChildren })

    // Connector to the next step — a filled rect, never a `k:'line'` node (see file doc).
    const isLastInRow =
      direction === 'horizontal' && (i % cols === cols - 1 || i === steps.length - 1)
    if (connector !== 'none' && i < steps.length - 1 && !isLastInRow) {
      const next = positions[i + 1]
      const ARROW_LEN = 8
      const ARROW_HALF_WIDTH = 5
      if (direction === 'horizontal') {
        const centerY = pos.y + BADGE_SIZE / 2
        const tipX = next.x
        const lineEndX = connector === 'arrow' ? tipX - ARROW_LEN : tipX
        children.push({
          k: 'rect',
          part: `step[${i}].connector`,
          box: {
            x: pos.x + stepWidth,
            y: centerY - CONNECTOR_THICKNESS / 2,
            width: Math.max(0, lineEndX - pos.x - stepWidth),
            height: CONNECTOR_THICKNESS,
          },
          fill: { type: 'solid', color: connectorColor },
        })
        if (connector === 'arrow') {
          const baseX = tipX - ARROW_LEN
          children.push({
            k: 'path',
            part: `step[${i}].connector-arrowhead`,
            box: { x: baseX, y: centerY - ARROW_HALF_WIDTH, width: ARROW_LEN, height: ARROW_HALF_WIDTH * 2 },
            d: `M ${tipX} ${centerY} L ${baseX} ${centerY - ARROW_HALF_WIDTH} L ${baseX} ${centerY + ARROW_HALF_WIDTH} Z`,
            fill: { type: 'solid', color: connectorColor },
          })
        }
      } else {
        const centerX = pos.x + BADGE_SIZE / 2
        const tipY = next.y
        const lineEndY = connector === 'arrow' ? tipY - ARROW_LEN : tipY
        children.push({
          k: 'rect',
          part: `step[${i}].connector`,
          box: {
            x: centerX - CONNECTOR_THICKNESS / 2,
            y: pos.y + stepHeight,
            width: CONNECTOR_THICKNESS,
            height: Math.max(0, lineEndY - pos.y - stepHeight),
          },
          fill: { type: 'solid', color: connectorColor },
        })
        if (connector === 'arrow') {
          const baseY = tipY - ARROW_LEN
          children.push({
            k: 'path',
            part: `step[${i}].connector-arrowhead`,
            box: { x: centerX - ARROW_HALF_WIDTH, y: baseY, width: ARROW_HALF_WIDTH * 2, height: ARROW_LEN },
            d: `M ${centerX} ${tipY} L ${centerX - ARROW_HALF_WIDTH} ${baseY} L ${centerX + ARROW_HALF_WIDTH} ${baseY} Z`,
            fill: { type: 'solid', color: connectorColor },
          })
        }
      }
    }
  }

  const rows = direction === 'horizontal' ? Math.ceil(steps.length / cols) : steps.length
  const contentWidth = direction === 'horizontal' ? cols * stepWidth + (cols - 1) * gap : stepWidth
  const contentHeight = rows * stepHeight + Math.max(0, rows - 1) * gap

  return {
    k: 'group',
    box: { x: 0, y: 0, width: Math.max(W, contentWidth), height: Math.max(H, contentHeight) },
    part: 'root',
    children,
  }
}

function calculatePositions(
  count: number,
  direction: string,
  cols: number,
  stepWidth: number,
  stepHeight: number,
  gap: number,
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []

  for (let i = 0; i < count; i++) {
    if (direction === 'horizontal') {
      const col = i % cols
      const row = Math.floor(i / cols)
      positions.push({ x: col * (stepWidth + gap), y: row * (stepHeight + gap) })
    } else {
      positions.push({ x: 0, y: i * (stepHeight + gap) })
    }
  }

  return positions
}
