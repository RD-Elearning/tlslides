/**
 * Pure layout function for tls.c.kpi-tile — KPI tile with value, delta, label,
 * optional sparkline, and polarity-driven colour.
 *
 * Parts (data-part):
 *   - `value`   — the big headline number
 *   - `delta`   — change indicator (only when delta prop is provided)
 *   - `label`   — the metric name
 *   - `sparkline` — mini line chart (only when sparkline prop is provided)
 *
 * Layout (top to bottom):
 *   1. label  (small muted text)
 *   2. value  (large headline number)
 *   3. delta + sparkline row (smaller, side by side when sparkline is present)
 *
 * Pure and DOM-free: no `document`, no `window`, no `Date.now()`, no `Math.random()`.
 */

import type { LayoutContext, LayoutNode, Stroke } from '../../../types'
import type { KpiTileProps } from './schema'
import { insetBox } from '../../../layout/box-model'

/**
 * Format a number for display based on the format hint.
 */
function formatValue(value: number, format?: string): string {
  switch (format) {
    case 'compact': {
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`
      if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`
      return value.toFixed(1)
    }
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'currency':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    default:
      return String(value)
  }
}

/**
 * Build an SVG path `d` string for a sparkline from an array of numbers.
 * Normalizes values to 0..1 vertically, spreads them across the available width.
 */
function sparklinePath(data: number[], width: number, height: number): string {
  if (data.length < 2) return ''
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)

  const points = data.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * height
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  })
  return points.join(' ')
}

export function layout(props: KpiTileProps, ctx: LayoutContext): LayoutNode {
  const W = ctx.box.width
  const H = ctx.box.height
  const outerBox = { x: 0, y: 0, width: W, height: H }
  const inner = insetBox(outerBox, ctx.tokens.space.md)

  const polarity = props.polarity ?? 'upGood'
  const delta = props.delta

  // Resolve delta colour: positive/negative role depends on polarity.
  let deltaColor: string
  if (delta == null) {
    deltaColor = ctx.resolveColor('neutral').color
  } else {
    const isPositive = delta >= 0
    const isGood = polarity === 'upGood' ? isPositive : !isPositive
    deltaColor = ctx.resolveColor(isGood ? 'positive' : 'negative').color
  }

  const children: LayoutNode[] = []
  let y = inner.y

  // --- label (top, muted) ---
  const labelStyle = ctx.resolveText('caption')
  const labelText = props.label ?? ''
  const labelMetrics = ctx.measureText(labelText, labelStyle, inner.width)
  children.push({
    k: 'text',
    part: 'label',
    box: { x: inner.x, y, width: inner.width, height: labelMetrics.height },
    lines: labelMetrics.lines,
    style: { ...labelStyle, color: ctx.resolveColor('textMuted').color },
  })
  y += labelMetrics.height + ctx.tokens.space.xs

  // --- value (big number) ---
  const valueStyle = ctx.resolveText('heading')
  const formattedValue = formatValue(props.value, props.format)
  const valueMetrics = ctx.measureText(formattedValue, valueStyle, inner.width)
  children.push({
    k: 'text',
    part: 'value',
    box: { x: inner.x, y, width: inner.width, height: valueMetrics.height },
    lines: valueMetrics.lines,
    style: { ...valueStyle, color: ctx.resolveColor('accent').color },
  })
  y += valueMetrics.height + ctx.tokens.space.xs

  // --- delta row (optional) ---
  if (delta != null) {
    const deltaStyle = ctx.resolveText('caption')
    const sign = delta >= 0 ? '+' : ''
    const deltaText = `${sign}${delta}`

    // Arrow character for direction
    const arrow = delta >= 0 ? '\u2191' : '\u2193'
    const arrowText = `${arrow} ${deltaText}`
    const arrowMetrics = ctx.measureText(arrowText, deltaStyle, inner.width)

    // When sparkline is present, delta takes left portion; sparkline takes right.
    const sparklineData = props.sparkline
    const hasSparkline = Array.isArray(sparklineData) && sparklineData.length >= 2

    if (hasSparkline && sparklineData) {
      const sparkWidth = Math.round(inner.width * 0.4)
      const textWidth = inner.width - sparkWidth - ctx.tokens.space.sm

      children.push({
        k: 'text',
        part: 'delta',
        box: { x: inner.x, y, width: textWidth, height: arrowMetrics.height },
        lines: arrowMetrics.lines,
        style: { ...deltaStyle, color: deltaColor },
      })

      // Sparkline path
      const sparkHeight = arrowMetrics.height * 0.8
      const sparkY = y + (arrowMetrics.height - sparkHeight) / 2
      const d = sparklinePath(sparklineData, sparkWidth, sparkHeight)
      if (d) {
        const sparkStroke: Stroke = { color: ctx.resolveColor('accent').color, width: 2 }
        children.push({
          k: 'path',
          part: 'sparkline',
          box: { x: inner.x + textWidth + ctx.tokens.space.sm, y: sparkY, width: sparkWidth, height: sparkHeight },
          d,
          stroke: sparkStroke,
        } as LayoutNode)
      }
    } else {
      children.push({
        k: 'text',
        part: 'delta',
        box: { x: inner.x, y, width: inner.width, height: arrowMetrics.height },
        lines: arrowMetrics.lines,
        style: { ...deltaStyle, color: deltaColor },
      })
    }
  } else {
    // No delta: optional standalone sparkline below value
    const sparklineData = props.sparkline
    if (Array.isArray(sparklineData) && sparklineData.length >= 2) {
      const sparkHeight = 40
      const sparkWidth = inner.width
      const d = sparklinePath(sparklineData, sparkWidth, sparkHeight)
      if (d) {
        const sparkStroke: Stroke = { color: ctx.resolveColor('accent').color, width: 2 }
        children.push({
          k: 'path',
          part: 'sparkline',
          box: { x: inner.x, y, width: sparkWidth, height: sparkHeight },
          d,
          stroke: sparkStroke,
        } as LayoutNode)
      }
    }
  }

  // Content height: measured bottom, plus top padding so the root box
  // actually contains all children (children start at inner.y).
  const lastChild = children[children.length - 1]
  const contentHeight = lastChild
    ? lastChild.box.y + lastChild.box.height - inner.y
    : 0

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: inner.y + contentHeight },
    part: 'root',
    children,
  }
}
