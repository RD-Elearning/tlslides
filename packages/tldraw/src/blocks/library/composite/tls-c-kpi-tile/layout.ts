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

import type { LayoutContext, LayoutNode, ResolvedTextStyle, Stroke } from '../../../types'
import type { KpiTileProps } from './schema'
import { insetBox } from '../../../layout/box-model'
import { isShown } from '../../../schema-helpers'
import { formatValue } from '../../data/_engine/format-value'
import { realWidth } from '../../data/_chart/inter-width'
import { tierStart } from '../../diagram/_kit'

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

type ValueToken = 'display' | 'title' | 'heading'
type SmallToken = 'lead' | 'body' | 'caption'
/** Value and label/delta sizes, largest first; the last is the compact tier every tile can take. */
const TIERS: ReadonlyArray<{ value: ValueToken; small: SmallToken }> = [
  { value: 'display', small: 'lead' },
  { value: 'display', small: 'body' },
  { value: 'title', small: 'lead' },
  { value: 'title', small: 'body' },
  { value: 'heading', small: 'body' },
  { value: 'heading', small: 'caption' },
]

/**
 * The index in `TIERS` of the largest type a tile with this `inner` box (padding removed) can take.
 * AC2: a tile with the height for it shows the value at `display`; a KPI row in a tall region used
 * to float a heading-size number in empty space. AC3 pre-item: a tile too narrow for the display
 * number (four tiles in a row) but with the height takes the `title` step instead of dropping to
 * the compact heading. 2026-10-24 review: the label grows to `lead` when the tile has the room, and
 * keeps `body` beside a heading value (a narrow tile with a long value dropped its label to caption
 * under an 80-px title). Exported for `tls.c.kpi-row` (one tier for the row).
 */
export function kpiTier(props: KpiTileProps, ctx: LayoutContext, inner: { width: number; height: number }): number {
  const formattedValue = formatValue(props.value, props.format, { locale: ctx.tokens.locale })
  const showDelta = isShown(props, 'showDelta') && props.delta != null
  const tierHeight = (valueToken: ValueToken, smallToken: SmallToken): number => {
    const small = ctx.resolveText(smallToken)
    const value = ctx.resolveText(valueToken)
    const labelH = isShown(props, 'showLabel') ? ctx.measureText(props.label ?? '', small, inner.width).height + ctx.tokens.space.xs : 0
    // the gap under the value only paints when a delta follows (a content-sized row gives the tile
    // exactly its painted height, and counting it dropped a tile that fits a step)
    // one line: the value never wraps, it shrinks to the tile's width (a heading-tier "120 → 55 hours"
    // measured as two lines dropped the row's labels to caption)
    const valueH = ctx.measureText(formattedValue, value).height + (showDelta ? ctx.tokens.space.xs : 0)
    const deltaH = showDelta ? ctx.measureText('\u2191 +0', small, inner.width).height : 0
    return labelH + valueH + deltaH
  }
  const start = tierStart(ctx, TIERS.length)
  const i = TIERS.findIndex((t, k) => {
    if (k < start) return false
    if (k === TIERS.length - 1) return true
    if (inner.height + 0.5 < tierHeight(t.value, t.small)) return false
    // a heading value too wide shrinks to fit below (it always did); the larger steps must fit as set
    if (t.value !== 'heading' && realWidth(formattedValue, ctx.resolveText(t.value)) * 1.03 > inner.width) return false
    // the label may wrap to two lines, never more
    return !isShown(props, 'showLabel') || ctx.measureText(props.label ?? '', ctx.resolveText(t.small), inner.width).lines.length <= 2
  })
  return i < 0 ? TIERS.length - 1 : i
}

/**
 * The value style shrunk (to half the heading size, then exactly) until the browser-true width fits
 * one line of `width` (RV04: a long value used to wrap or run out of a narrow tile; LO6: with true
 * widths the layout wrapped what the old estimate kept on one line while the DOM ran past the tile).
 */
function fittedValueStyle(ctx: LayoutContext, value: string, base: ResolvedTextStyle, width: number): ResolvedTextStyle {
  let s = base
  for (let k = 0; k < 8 && realWidth(value, s) * 1.03 > width && s.size > 0.5 * ctx.resolveText('heading').size; k++) s = { ...s, size: s.size * 0.9 }
  const rw = realWidth(value, s) * 1.03
  return rw > width ? { ...s, size: (s.size * width) / rw } : s
}

/** The value size a tile at tier `index` and inner width `width` draws (for `tls.c.kpi-row`). */
export function kpiValueSize(props: KpiTileProps, ctx: LayoutContext, index: number, width: number): number {
  const t = TIERS[Math.max(0, Math.min(TIERS.length - 1, index))]
  return fittedValueStyle(ctx, formatValue(props.value, props.format, { locale: ctx.tokens.locale }), ctx.resolveText(t.value), width).size
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

  const formattedValue = formatValue(props.value, props.format, { locale: ctx.tokens.locale })
  // a kpi-row passes the smallest tier its tiles chose, so peers keep one value and one label size
  const floor = typeof props.tierFloor === 'number' && Number.isFinite(props.tierFloor) ? Math.max(0, Math.min(TIERS.length - 1, Math.floor(props.tierFloor))) : 0
  const tier = TIERS[Math.max(floor, kpiTier(props, ctx, inner))]
  const smallToken = tier.small

// --- label (top, muted) ---
  if (isShown(props, 'showLabel')) {
    const labelStyle = ctx.resolveText(smallToken)
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
  }

  // --- value (big number) ---
  // One line, shrunk (to 0.5) until the browser-true width fits the tile: a long value ("$1,234,567")
  // used to wrap or run out of a narrow tile (RV04).
  let valueStyle = fittedValueStyle(ctx, formattedValue, ctx.resolveText(tier.value), inner.width)
  // a kpi-row passes its tiles' smallest fitted value size, so the row draws one number size
  if (typeof props.valueSize === 'number' && Number.isFinite(props.valueSize) && props.valueSize < valueStyle.size) valueStyle = { ...valueStyle, size: props.valueSize }
  // one line: the loop above sized it to the browser-true width (the flat estimate could wrap it)
  const valueMetrics = ctx.measureText(formattedValue, valueStyle)
  // a value shrunk to fit keeps its tier's line: `kpiTier` counts that height, and a content-sized
  // row given exactly it must find the same tier again (a shorter line dropped the labels a step)
  // (not the last tier: it is taken whether it fits or not, and a reserved line would overflow)
  const valueLine = tier === TIERS[TIERS.length - 1] ? valueMetrics.height : Math.max(valueMetrics.height, ctx.measureText(formattedValue, ctx.resolveText(tier.value)).height)
  const valueTop = y + (valueLine - valueMetrics.height)
  children.push({
    k: 'text',
    part: 'value',
    box: { x: inner.x, y: valueTop, width: inner.width, height: valueMetrics.height },
    lines: valueMetrics.lines,
    style: { ...valueStyle, color: ctx.resolveColor('accent').color },
  })
  y += valueLine + ctx.tokens.space.xs

  // --- delta row (optional) ---
  if (isShown(props, 'showDelta') && delta != null) {
    const deltaStyle = ctx.resolveText(smallToken)
    const sign = delta >= 0 ? '+' : ''
    const deltaText = `${sign}${delta}`

    // Arrow character for direction
    const arrow = delta >= 0 ? '\u2191' : '\u2193'
    const arrowText = `${arrow} ${deltaText}`
    const arrowMetrics = ctx.measureText(arrowText, deltaStyle, inner.width)

    // When sparkline is present, delta takes left portion; sparkline takes right.
    const sparklineData = props.sparkline
    const hasSparkline = isShown(props, 'showSparkline') && Array.isArray(sparklineData) && sparklineData.length >= 2

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
    if (isShown(props, 'showSparkline') && Array.isArray(sparklineData) && sparklineData.length >= 2) {
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
    // Bottom padding equals the top one: the last line used to sit on the tile's bottom edge.
    box: { x: 0, y: 0, width: W, height: inner.y + contentHeight + ctx.tokens.space.md },
    part: 'root',
    children,
  }
}
