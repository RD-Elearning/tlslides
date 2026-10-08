/**
 * Axis layout for data charts — labels, ticks, baseline.
 *
 * Pure functions, no DOM, no block dependency. Computes the geometry of a
 * Y-axis alongside a chart, given tick values and the chart's drawing area.
 *
 * Used by the shared chart engine (04 §4.8) so every data block produces
 * consistent axis geometry.
 */

import type { Box, LayoutNode, ResolvedTextStyle } from '../../../types'
import type { LinearScale } from './linear-scale'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Axis layout configuration                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Configuration for an axis layout.
 */
export interface AxisLayoutConfig {
  /** The tick values to display. */
  ticks: number[]
  /** The linear scale mapping domain values to pixel positions (Y-axis: higher value → lower y). */
  scale: LinearScale
  /** The chart drawing area (the box where bars are drawn, not including axis space). */
  chartBox: Box
  /** Text style for axis labels. */
  labelStyle: ResolvedTextStyle
  /** Width reserved for axis labels (slide units). Default 60. */
  labelWidth?: number
  /** Tick length in slide units. Default 6. */
  tickLength?: number
  /** Colour of the axis baseline and ticks. */
  axisColor?: string
}

/**
 * Result of axis layout computation.
 */
export interface AxisLayoutResult {
  /** Total width the axis consumes (label + tick + margin). */
  axisWidth: number
  /** Layout nodes for the axis (ticks, labels, baseline). */
  nodes: LayoutNode[]
  /** The adjusted chart box after accounting for the axis. */
  adjustedChartBox: Box
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Axis layout                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Compute axis geometry and produce LayoutNodes for a Y-axis (value axis).
 *
 * The axis is positioned to the left of `chartBox`. The baseline (zero line)
 * is always rendered if zero is within the tick range.
 */
export function computeYAxis(config: AxisLayoutConfig): AxisLayoutResult {
  const {
    ticks,
    scale,
    chartBox,
    labelStyle,
    labelWidth = 60,
    tickLength = 6,
    axisColor = '#6b7280',
  } = config

  const nodes: LayoutNode[] = []
  const axisWidth = labelWidth + tickLength + 4 // 4 = small gap between tick and chart

  // Baseline (zero line) — always drawn if zero is in the tick set
  if (ticks.some((t) => Math.abs(t) < 1e-10)) {
    const zeroY = scale(0)
    nodes.push({
      k: 'line',
      // `width` must equal `to.x - from.x`. Both renderers draw a line from `from`/`to` and use
      // `box` only as its reported extent, so a box wider than the line it describes is a lie
      // that nothing catches at runtime — it silently misreports the part's geometry to anything
      // measuring it (parity checks, hit-testing, overflow detection). The line starts one
      // `tickLength` left of the chart and ends at the chart's right edge, so it spans
      // `chartBox.width + tickLength`, not `+ tickLength * 2`.
      box: { x: chartBox.x - tickLength, y: zeroY, width: chartBox.width + tickLength, height: 0 },
      part: 'axis/baseline',
      from: { x: chartBox.x - tickLength, y: zeroY },
      to: { x: chartBox.x + chartBox.width, y: zeroY },
      stroke: { color: axisColor, width: 1 },
    })
  }

  // Tick marks and labels
  for (let i = 0; i < ticks.length; i++) {
    const tickValue = ticks[i]
    const tickY = scale(tickValue)

    // Skip ticks too close to the baseline if it's already drawn
    const isZeroTick = Math.abs(tickValue) < 1e-10
    if (!isZeroTick || !nodes.some((n) => n.part === 'axis/baseline')) {
      // Tick mark (small horizontal line)
      nodes.push({
        k: 'line',
        box: {
          x: chartBox.x - tickLength,
          y: tickY,
          width: tickLength,
          height: 0,
        },
        part: `axis/tick-${i}`,
        from: { x: chartBox.x - tickLength, y: tickY },
        to: { x: chartBox.x, y: tickY },
        stroke: { color: axisColor, width: 1 },
      })
    }

    // Label (text)
    const label = formatTickLabel(tickValue)
    const labelHeight = labelStyle.size * labelStyle.lineHeight

    nodes.push({
      k: 'text',
      box: {
        x: 0,
        y: tickY - labelHeight / 2,
        width: labelWidth,
        height: labelHeight,
      },
      part: `axis/label-${i}`,
      lines: [{ text: label, baseline: labelStyle.size, width: labelWidth }],
      style: { ...labelStyle },
    })
  }

  // Adjusted chart box — shifted right to make room for the axis
  const adjustedChartBox: Box = {
    x: chartBox.x + axisWidth,
    y: chartBox.y,
    width: Math.max(0, chartBox.width - axisWidth),
    height: chartBox.height,
  }

  return { axisWidth, nodes, adjustedChartBox }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Formatting                                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Format a tick value for display. Uses compact notation for large numbers.
 */
export function formatTickLabel(value: number): string {
  // Handle exact zero
  if (Math.abs(value) < 1e-10) return '0'
  // Integer values
  if (Number.isInteger(value)) return value.toLocaleString()
  // One decimal for fractional ticks
  return value.toFixed(1)
}
