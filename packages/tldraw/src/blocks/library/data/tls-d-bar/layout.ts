/**
 * Pure layout function for tls.d.bar — vertical column chart.
 *
 * Baseline is always zero. Bars grow upward. NaN/null values are omitted
 * with a visible gap and no silent coercion to zero (04 §4.8).
 *
 * Uses the shared chart engine (linear scale, axis layout, series colors).
 */

import type { Box, LayoutContext, LayoutNode } from '../../../types'
import type { BarChartProps } from './schema'
import { linearScale, niceTicks, barDomain } from '../_engine/linear-scale'
import { computeYAxis } from '../_engine/axis-layout'
import { assignSeriesColors, highlightColor } from '../_engine/series-color'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Layout constants                                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Default padding around the chart area (slide units). */
const PADDING = 24
/** Gap between bars within a group (slide units). */
const BAR_GAP = 8
/** Maximum bar group width as a fraction of available width. */
const MAX_BAR_FILL = 0.75
/** Minimum bar width (slide units). */
const MIN_BAR_WIDTH = 8
/** Title height allocation (slide units). */
const TITLE_HEIGHT = 48
/** Title gap below (slide units). */
const TITLE_GAP = 8

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Layout function                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Compute bar positions and return a LayoutNode tree for a vertical column chart.
 */
export function layout(props: BarChartProps, ctx: LayoutContext): LayoutNode {
  const { categories, series, highlightIndex = -1, title } = props
  const n = categories.length
  if (n === 0) {
    return emptyLayout(ctx)
  }

  // ── Determine chart area ────────────────────────────────────────────────────
  const totalW = ctx.box.width
  const totalH = ctx.box.height
  const hasTitle = title && title.trim().length > 0

  const topOffset = hasTitle ? TITLE_HEIGHT + TITLE_GAP : 0
  const chartBox: Box = {
    x: PADDING,
    y: topOffset + PADDING,
    width: Math.max(0, totalW - PADDING * 2),
    height: Math.max(0, totalH - topOffset - PADDING * 2),
  }

  // ── Compute domain and scale (baseline always zero) ─────────────────────────
  const domain = barDomain(series as number[])
  // Y-axis: higher values → lower y positions. Includes chartBox.y offset for absolute positioning.
  const yScale = linearScale(domain, [chartBox.y + chartBox.height, chartBox.y])

  // ── Generate ticks ──────────────────────────────────────────────────────────
  const ticks = niceTicks(domain, 6)

  // ── Compute Y-axis geometry ─────────────────────────────────────────────────
  const labelStyle = ctx.resolveText('caption')
  // Build a proper LinearScale for the axis: maps domain to pixel positions including chartBox.y offset
  const axisScale = linearScale(domain, [chartBox.y + chartBox.height, chartBox.y])
  const axisResult = computeYAxis({
    ticks,
    scale: axisScale,
    chartBox,
    labelStyle,
    labelWidth: 48,
    tickLength: 6,
    axisColor: ctx.resolveColor('line').color,
  })

  const barArea: Box = axisResult.adjustedChartBox

  // ── Assign colors ───────────────────────────────────────────────────────────
  const hasHighlight = highlightIndex >= 0 && highlightIndex < n
  const colors = assignSeriesColors(1, ctx.tokens) // single series chart

  // ── Compute bar widths ──────────────────────────────────────────────────────
  const availableWidth = barArea.width
  const totalGap = (n - 1) * BAR_GAP
  const rawBarWidth = (availableWidth - totalGap) / n
  const barWidth = Math.max(MIN_BAR_WIDTH, Math.min(rawBarWidth, availableWidth * MAX_BAR_FILL / n))
  // Re-center bars when clamped
  const totalBarWidth = n * barWidth + (n - 1) * BAR_GAP
  const barAreaXOffset = (availableWidth - totalBarWidth) / 2

  // ── Build bar nodes ─────────────────────────────────────────────────────────
  const children: LayoutNode[] = []

  // Title
  if (hasTitle && title) {
    const titleStyle = ctx.resolveText('subheading')
    const titleMetrics = ctx.measureText(title, titleStyle)
    children.push({
      k: 'text',
      box: {
        x: PADDING,
        y: 0,
        width: totalW - PADDING * 2,
        height: TITLE_HEIGHT,
      },
      part: 'title',
      lines: titleMetrics.lines,
      style: titleStyle,
    })
  }

  // Y-axis nodes
  for (const axisNode of axisResult.nodes) {
    // Offset axis nodes by chartBox position
    children.push(offsetNode(axisNode, barArea.x - axisResult.axisWidth, 0))
  }

  // Baseline group — yScale already includes chartBox.y offset
  const baselineY = yScale(0)

  // Bars
  const hlIdx = hasHighlight ? highlightIndex : -1
  for (let i = 0; i < n; i++) {
    const value = series[i]
    const x = barArea.x + barAreaXOffset + i * (barWidth + BAR_GAP)

    // Handle NaN/null — omit the bar, leave a gap
    if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
      // Render a subtle gap marker (dashed outline)
      children.push({
        k: 'rect',
        box: { x, y: barArea.y, width: barWidth, height: barArea.height },
        part: `bar/gap-${i}`,
        stroke: { color: ctx.resolveColor('line').color, width: 1 },
      })
      // Category label even for gaps
      children.push(makeCategoryLabel(categories[i], x, barWidth, baselineY, ctx))
      continue
    }

    // Positive values grow upward from baseline — yScale already includes chartBox.y
    const barTop = yScale(Math.max(0, value))
    const barBottom = yScale(0)
    const barH = Math.abs(barBottom - barTop)

    // Determine bar fill color
    let fillColor: string
    if (hasHighlight) {
      fillColor = highlightColor(i, hlIdx, colors[0], ctx.tokens)
    } else {
      fillColor = colors[0]
    }

    // Bar rectangle
    children.push({
      k: 'rect',
      box: { x, y: barTop, width: barWidth, height: barH },
      part: `bar/${i}`,
      fill: { type: 'solid', color: fillColor },
    })

    // Category label below the baseline
    children.push(makeCategoryLabel(categories[i], x, barWidth, baselineY, ctx))
  }

  // Gridlines (recessive, at tick y-positions) — yScale already includes chartBox.y
  for (const tickVal of ticks) {
    if (Math.abs(tickVal) < 1e-10) continue // skip zero (that's the baseline)
    const gridY = yScale(tickVal)
    children.push({
      k: 'line',
      box: { x: barArea.x, y: gridY, width: barArea.width, height: 0 },
      part: `gridline/${tickVal}`,
      from: { x: barArea.x, y: gridY },
      to: { x: barArea.x + barArea.width, y: gridY },
      stroke: { color: ctx.resolveColor('line').color, width: 0.5 },
    })
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: totalW, height: totalH },
    part: 'root',
    children,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Create a category label centered below a bar. */
function makeCategoryLabel(
  label: string,
  barX: number,
  barWidth: number,
  baselineY: number,
  ctx: LayoutContext
): LayoutNode {
  const style = ctx.resolveText('footnote')
  const metrics = ctx.measureText(label, style)
  const labelWidth = Math.max(barWidth, metrics.width)
  return {
    k: 'text',
    box: {
      x: barX + barWidth / 2 - labelWidth / 2,
      y: baselineY + 4,
      width: labelWidth,
      height: metrics.lines.length * style.size * style.lineHeight,
    },
    part: 'label',
    lines: metrics.lines,
    style,
  }
}

/** Offset a layout node's box by (dx, dy). Shallow — only the outermost box. */
function offsetNode(node: LayoutNode, dx: number, dy: number): LayoutNode {
  return {
    ...node,
    box: {
      x: node.box.x + dx,
      y: node.box.y + dy,
      width: node.box.width,
      height: node.box.height,
    },
  }
}

/** Layout for an empty chart (no categories). */
function emptyLayout(ctx: LayoutContext): LayoutNode {
  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'root',
    children: [],
  }
}
