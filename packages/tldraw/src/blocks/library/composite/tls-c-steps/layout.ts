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
import { onColor } from '../../text/_engine/color'
import { realWidth } from '../../data/_chart/inter-width'

const CONNECTOR_THICKNESS = 2
const MARKER_SIZE = 48
// G8.4: a step's title is one of N items sharing a compact region, not a full slide title —
// `'title'` (96 slide units, sized for a 1920×1080 frame) never fit N-per-row/column at any
// realistic step count once tls.t.title stopped silently clamping its own reported height to
// whatever box it was given (BACKLOG-visual-fix-2.md §8.4). `'subheading'` still reads larger
// than the description below it (tls.t.body, fixed at the 'body' token), matching the
// title-bigger-than-description hierarchy tls.g.steps and tls.c.agenda already use for the same
// kind of item. Shared by the naive pre-measurement below and the real delegated layout so the
// two never drift apart again (the exact "two inline measurement copies" class of bug named in
// §0.6).
const STEP_TITLE_TYPE_TOKEN = 'subheading'

/**
 * Format a step number as a marker string.
 */
function formatMarker(index: number): string {
  return `${index + 1}`
}

/**
 * Build the marker: a filled accent badge plus the step number centred on it (RV07: the number was
 * a 14 px text on nothing, centred in the column while the title was left-aligned).
 */
function buildMarker(index: number, x: number, y: number, size: number, ctx: LayoutContext): LayoutNode[] {
  const text = formatMarker(index)
  const accent = ctx.resolveColor('accent').color
  const style = { ...ctx.resolveText('body', { size: Math.round(size * 0.42) }), color: onColor(ctx, accent) }
  const w = Math.ceil(realWidth(text, style) * 1.04) + 1
  const lh = style.size * style.lineHeight
  const m = ctx.measureText(text, style, w + 8)
  return [
    { k: 'rect', part: `step[${index}].badge`, box: { x, y, width: size, height: size }, fill: { type: 'solid', color: accent }, radius: size / 2 },
    {
      k: 'text',
      part: `step[${index}].marker`,
      box: { x: x + (size - w) / 2, y: y + (size - lh) / 2, width: w, height: lh },
      lines: m.lines.map((l) => ({ ...l, width: w })),
      style,
    },
  ]
}

/**
 * Measure the intrinsic height of a title text (for layout positioning).
 */
function measureTitleHeight(title: string, width: number, ctx: LayoutContext): number {
  const style = ctx.resolveText(STEP_TITLE_TYPE_TOKEN, { letterSpacing: -0.03 })
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
    props: { text: title, size: STEP_TITLE_TYPE_TOKEN },
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
    fill: { type: 'solid', color: ctx.resolveColor('textMuted').color },
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
  return orientation === 'horizontal' ? layoutHorizontal(steps, n, W, H, ctx) : layoutVertical(steps, n, W, H, ctx)
}

/** Shift every node of a flat child list down by `dy` (vertical centring of the whole content). */
function shiftY(nodes: LayoutNode[], dy: number): LayoutNode[] {
  if (dy <= 0) return nodes
  return nodes.map((n) => ({ ...n, box: { ...n.box, y: n.box.y + dy } }) as LayoutNode)
}

const MIN_COL = 130
const RAIL_PAD = 8

/**
 * Horizontal: a badge at the left of every column with the title and description under it, a thin
 * rail from badge to badge. Columns narrower than MIN_COL wrap to a second row; the content block
 * is centred in the region's height.
 */
function layoutHorizontal(steps: StepsProps['steps'], n: number, W: number, H: number, ctx: LayoutContext): LayoutNode {
  const GAP = ctx.tokens.space.lg
  const fit = Math.max(1, Math.floor((W + GAP) / (MIN_COL + GAP)))
  const rows = Math.ceil(n / Math.min(n, fit))
  const cols = Math.ceil(n / rows)
  const stepWidth = Math.max(10, (W - (cols - 1) * GAP) / cols)
  const markerGap = ctx.tokens.space.sm

  const heights = steps.map((s) => {
    const t = measureTitleHeight(s.title, stepWidth, ctx)
    const d = s.desc ? measureDescHeight(s.desc, stepWidth, ctx) : 0
    return { t, d }
  })
  const rowH = (r: number) => {
    const slice = heights.slice(r * cols, r * cols + cols)
    return MARKER_SIZE + markerGap + Math.max(...slice.map((h) => h.t + h.d))
  }
  const rowGap = ctx.tokens.space.xl
  const total = Array.from({ length: rows }, (_, r) => rowH(r)).reduce((a, b) => a + b, 0) + (rows - 1) * rowGap

  const children: LayoutNode[] = []
  let y0 = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      if (i >= n) break
      const step = steps[i]
      const x = c * (stepWidth + GAP)
      children.push(...buildMarker(i, x, y0, MARKER_SIZE, ctx))
      const titleY = y0 + MARKER_SIZE + markerGap
      children.push(buildTitle(i, step.title, x, titleY, stepWidth, heights[i].t, ctx))
      if (step.desc) children.push(buildDesc(i, step.desc, x, titleY + heights[i].t, stepWidth, heights[i].d, ctx))
      // Rail to the next badge in the same row.
      if (c < cols - 1 && i < n - 1) {
        const from = x + MARKER_SIZE + RAIL_PAD
        const to = x + stepWidth + GAP - RAIL_PAD
        children.push(buildConnector(i, from, y0 + (MARKER_SIZE - CONNECTOR_THICKNESS) / 2, Math.max(1, to - from), CONNECTOR_THICKNESS, ctx))
      }
    }
    y0 += rowH(r) + rowGap
  }
  return { k: 'group', box: { x: 0, y: 0, width: W, height: H }, part: 'root', children: shiftY(children, Math.max(0, (H - total) / 2)) }
}

/**
 * Vertical: badge at the left, title and description to its right, a thin rail down between
 * badges; the rows share the height and the whole block is centred.
 */
function layoutVertical(steps: StepsProps['steps'], n: number, W: number, H: number, ctx: LayoutContext): LayoutNode {
  const textX = MARKER_SIZE + ctx.tokens.space.md
  const textColW = Math.max(10, W - textX)
  const heights = steps.map((s) => {
    const t = measureTitleHeight(s.title, textColW, ctx)
    const d = s.desc ? measureDescHeight(s.desc, textColW, ctx) : 0
    return { t, d, h: Math.max(MARKER_SIZE, t + d) }
  })
  const natural = heights.reduce((a, b) => a + b.h, 0)
  // Share what is left over as the gap between rows (at least the rail padding), never negative.
  const gap = Math.max(2 * RAIL_PAD + 8, Math.min(ctx.tokens.space.xl * 1.5, (H - natural) / Math.max(1, n - 1)))
  const total = natural + (n - 1) * gap

  const children: LayoutNode[] = []
  let y = 0
  for (let i = 0; i < n; i++) {
    const step = steps[i]
    const { t, d, h } = heights[i]
    children.push(...buildMarker(i, 0, y, MARKER_SIZE, ctx))
    // Text block centred against the badge when it is shorter than it.
    const ty = y + Math.max(0, (MARKER_SIZE - (t + d)) / 2)
    children.push(buildTitle(i, step.title, textX, ty, textColW, t, ctx))
    if (step.desc) children.push(buildDesc(i, step.desc, textX, ty + t, textColW, d, ctx))
    if (i < n - 1) {
      const from = y + MARKER_SIZE + RAIL_PAD
      const to = y + h + gap - RAIL_PAD
      children.push(buildConnector(i, (MARKER_SIZE - CONNECTOR_THICKNESS) / 2, from, CONNECTOR_THICKNESS, Math.max(1, to - from), ctx))
    }
    y += h + gap
  }
  return { k: 'group', box: { x: 0, y: 0, width: W, height: H }, part: 'root', children: shiftY(children, Math.max(0, (H - total) / 2)) }
}
