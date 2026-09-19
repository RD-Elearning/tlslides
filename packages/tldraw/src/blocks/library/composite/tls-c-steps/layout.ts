/**
 * Pure layout function for tls.c.steps - process/timeline of steps.
 *
 * Lays out N steps with N-1 connectors. Supports horizontal (left-to-right)
 * and vertical (top-to-bottom) orientation.
 *
 * Delegates text rendering to existing blocks via ctx.layoutChild:
 *   - Title: tls.t.title
 *   - Description: tls.t.body
 * Markers are rendered as text nodes directly (numbered).
 *
 * Connectors are drawn as thin rect nodes (the B.5 lesson: a horizontal
 * line's box height and its SVG endpoint geometry disagree; rects keep
 * DOM/SVG geometry parity by construction).
 *
 * Pure and DOM-free: no document, window, Date.now(), Math.random().
 */

import type { BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import type { StepsProps } from './schema'

const CONNECTOR_THICKNESS = 2
const CONNECTOR_GAP = 12
const MARKER_SIZE = 28

/**
 * Format a step number as a marker string.
 */
function formatMarker(index: number): string {
  return `${index + 1}`
}

/**
 * Build the marker text node.
 */
function buildMarker(
  index: number,
  x: number,
  y: number,
  w: number,
  ctx: LayoutContext,
): LayoutNode {
  const text = formatMarker(index)
  const style = ctx.resolveText('body', { size: 14 })
  const m = ctx.measureText(text, style, w)
  return {
    k: 'text',
    part: `step[${index}].marker`,
    box: { x, y, width: w, height: m.height },
    lines: m.lines,
    style,
  }
}

/**
 * Measure the intrinsic height of a title text (for layout positioning).
 */
function measureTitleHeight(title: string, width: number, ctx: LayoutContext): number {
  const style = ctx.resolveText('title', { letterSpacing: -0.03 })
  const m = ctx.measureText(title, style, width)
  return m.height
}

/**
 * Measure the intrinsic height of a description text (for layout positioning).
 */
function measureDescHeight(desc: string, width: number, ctx: LayoutContext): number {
  const style = ctx.resolveText('body')
  const m = ctx.measureText(desc, style, width)
  return m.height
}

/**
 * Build a title node by delegating to tls.t.title.
 */
function buildTitle(
  index: number,
  title: string,
  x: number,
  y: number,
  w: number,
  availableH: number,
  ctx: LayoutContext,
): LayoutNode {
  const spec: BlockSpec = {
    id: `step-${index}-title`,
    type: 'tls.t.title',
    props: { text: title },
  }
  const wrapper = ctx.layoutChild(spec, { x, y, width: w, height: availableH })
  // Override the wrapper group's part with our step-specific part name.
  return { ...wrapper, part: `step[${index}].title` } as LayoutNode
}

/**
 * Build a description node by delegating to tls.t.body.
 */
function buildDesc(
  index: number,
  desc: string,
  x: number,
  y: number,
  w: number,
  availableH: number,
  ctx: LayoutContext,
): LayoutNode {
  const spec: BlockSpec = {
    id: `step-${index}-desc`,
    type: 'tls.t.body',
    props: { text: desc },
  }
  const wrapper = ctx.layoutChild(spec, { x, y, width: w, height: availableH })
  return { ...wrapper, part: `step[${index}].desc` } as LayoutNode
}

/**
 * Build a connector rect node.
 */
function buildConnector(
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
  ctx: LayoutContext,
): LayoutNode {
  return {
    k: 'rect',
    part: `connector[${index}]`,
    box: { x, y, width: w, height: h },
    fill: { type: 'solid', color: ctx.resolveColor('line').color },
  }
}

export function layout(props: StepsProps, ctx: LayoutContext): LayoutNode {
  const steps = props.steps ?? []
  const orientation = props.orientation ?? 'horizontal'
  const W = ctx.box.width
  const H = ctx.box.height
  const n = steps.length

  if (n === 0) {
    return { k: 'group', box: { x: 0, y: 0, width: W, height: 0 }, part: 'root', children: [] }
  }

  const connectors = Math.max(0, n - 1)

  if (orientation === 'horizontal') {
    return layoutHorizontal(steps, n, connectors, W, H, ctx)
  }
  return layoutVertical(steps, n, connectors, W, H, ctx)
}

/**
 * Horizontal layout: steps arranged left to right, connectors between them.
 *
 * DOM order per step: marker, title, desc, then connector.
 */
function layoutHorizontal(
  steps: StepsProps['steps'],
  n: number,
  connectors: number,
  W: number,
  H: number,
  ctx: LayoutContext,
): LayoutNode {
  const totalConnectorWidth = connectors * (CONNECTOR_GAP + CONNECTOR_THICKNESS + CONNECTOR_GAP)
  const stepWidth = Math.max(10, (W - totalConnectorWidth) / n)

  const children: LayoutNode[] = []
  let x = 0

  for (let i = 0; i < n; i++) {
    const step = steps[i]

    // Measure intrinsic heights for positioning
    const titleIntrinsicH = measureTitleHeight(step.title, stepWidth, ctx)
    const descIntrinsicH = step.desc ? measureDescHeight(step.desc, stepWidth, ctx) : 0
    const markerGap = ctx.tokens.space.xs

    // Marker centred in the step column
    const markerY = 0
    children.push(buildMarker(i, x + (stepWidth - MARKER_SIZE) / 2, markerY, MARKER_SIZE, ctx))

    // Title below marker
    const titleY = MARKER_SIZE + markerGap
    children.push(
      buildTitle(i, step.title, x, titleY, stepWidth, titleIntrinsicH, ctx),
    )

    // Description below title if present
    if (step.desc) {
      const descY = titleY + titleIntrinsicH
      if (descY < H) {
        children.push(
          buildDesc(i, step.desc, x, descY, stepWidth, descIntrinsicH, ctx),
        )
      }
    }

    x += stepWidth

    // Connector (except after last step)
    if (i < n - 1) {
      const connX = x
      const connW = CONNECTOR_GAP + CONNECTOR_THICKNESS + CONNECTOR_GAP
      const connY = (MARKER_SIZE - CONNECTOR_THICKNESS) / 2
      children.push(buildConnector(i, connX, connY, connW, CONNECTOR_THICKNESS, ctx))
      x += connW
    }
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children,
  }
}

/**
 * Vertical layout: steps arranged top to bottom, connectors between them.
 *
 * DOM order per step: marker, title, desc, then connector.
 */
function layoutVertical(
  steps: StepsProps['steps'],
  n: number,
  connectors: number,
  W: number,
  H: number,
  ctx: LayoutContext,
): LayoutNode {
  const totalConnectorHeight = connectors * (CONNECTOR_GAP + CONNECTOR_THICKNESS + CONNECTOR_GAP)
  const stepHeight = Math.max(10, (H - totalConnectorHeight) / n)
  const markerColW = MARKER_SIZE + ctx.tokens.space.sm
  const textColW = Math.max(10, W - markerColW)

  const children: LayoutNode[] = []
  let y = 0

  for (let i = 0; i < n; i++) {
    const step = steps[i]

    // Measure intrinsic heights for positioning
    const titleIntrinsicH = measureTitleHeight(step.title, textColW, ctx)
    const descIntrinsicH = step.desc ? measureDescHeight(step.desc, textColW, ctx) : 0

    // Clamp title and desc to fit within stepHeight so content from one step
    // never spills into the next step's area.
    const titleH = Math.min(titleIntrinsicH, stepHeight)
    const descH = step.desc
      ? Math.min(descIntrinsicH, Math.max(0, stepHeight - titleH))
      : 0

    // Marker left column, vertically centred
    children.push(
      buildMarker(i, 0, y + (stepHeight - MARKER_SIZE) / 2, MARKER_SIZE, ctx),
    )

    // Title right of marker — use clamped height so tls.t.title autofits
    const textX = markerColW
    children.push(
      buildTitle(i, step.title, textX, y, textColW, titleH, ctx),
    )

    // Description below title (only if clamped height > 0)
    if (step.desc && descH > 0) {
      const descY = y + titleH
      children.push(
        buildDesc(i, step.desc, textX, descY, textColW, descH, ctx),
      )
    }

    y += stepHeight

    // Connector (except after last step)
    if (i < n - 1) {
      const connY = y
      const connH = CONNECTOR_GAP + CONNECTOR_THICKNESS + CONNECTOR_GAP
      const connX = (MARKER_SIZE - CONNECTOR_THICKNESS) / 2
      children.push(buildConnector(i, connX, connY, CONNECTOR_THICKNESS, connH, ctx))
      y += connH
    }
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children,
  }
}
