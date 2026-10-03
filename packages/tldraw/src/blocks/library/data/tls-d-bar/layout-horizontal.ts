/**
 * tls.d.bar, `orientation: 'horizontal'` — bars grow rightwards from a zero baseline.
 *
 * Category labels sit on the left, wrapped to at most two lines (the second line is cut with an
 * ellipsis when it still does not fit); values run along x with a tick-label row underneath.
 * Same rules as the vertical chart: zero baseline, null/NaN leave a gap marker rather than a
 * zero-length bar, single series uses `accent`, highlight recolours one bar and mutes the rest.
 */

import type { Box, LayoutContext, LayoutNode, TextLine } from '../../../types'
import type { BarChartProps } from './schema'
import { linearScale, niceTicks, barDomain } from '../_engine/linear-scale'
import { formatTickLabel } from '../_engine/axis-layout'
import { assignSeriesColors, highlightColor } from '../_engine/series-color'
import { bandScale } from '../_engine/multi-series'

const PADDING = 24
const TITLE_HEIGHT = 48
const TITLE_GAP = 8
/** Labels may take at most this share of the chart width. */
const MAX_LABEL_SHARE = 0.3
const LABEL_GAP = 12
const MAX_LINES = 2
/** Tallest a bar may be, so a two-bar chart does not become two slabs. */
const MAX_BAR_THICKNESS = 56
const BAND_PADDING = 0.35
const TICK_LABEL_WIDTH = 56
const AXIS_GAP = 6

function isMissing(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))
}

/** Keep the first two lines; when more existed, end the second with an ellipsis. */
function clampLines(lines: TextLine[], more: boolean): TextLine[] {
  const kept = lines.slice(0, MAX_LINES)
  if (more && kept.length === MAX_LINES) {
    const last = kept[MAX_LINES - 1]
    kept[MAX_LINES - 1] = { ...last, text: `${last.text.replace(/\s+$/, '')}…` }
  }
  return kept
}

export function layoutHorizontal(props: BarChartProps, ctx: LayoutContext): LayoutNode {
  const { categories, series, highlightIndex = -1, title } = props
  const n = categories.length
  const totalW = ctx.box.width
  const totalH = ctx.box.height
  const root = (children: LayoutNode[]): LayoutNode => ({
    k: 'group',
    box: { x: 0, y: 0, width: totalW, height: totalH },
    part: 'root',
    children,
  })
  if (n === 0) return root([])

  const hasTitle = !!title && title.trim().length > 0
  const topOffset = hasTitle ? TITLE_HEIGHT + TITLE_GAP : 0
  const chartBox: Box = {
    x: PADDING,
    y: topOffset + PADDING,
    width: Math.max(0, totalW - PADDING * 2),
    height: Math.max(0, totalH - topOffset - PADDING * 2),
  }

  const labelStyle = ctx.resolveText('footnote')
  const lineH = labelStyle.size * labelStyle.lineHeight
  const children: LayoutNode[] = []

  if (hasTitle && title) {
    const titleStyle = ctx.resolveText('subheading')
    children.push({
      k: 'text',
      box: { x: PADDING, y: 0, width: totalW - PADDING * 2, height: TITLE_HEIGHT },
      part: 'title',
      lines: ctx.measureText(title, titleStyle).lines,
      style: titleStyle,
    })
  }

  // ── Label column: as wide as the longest single-line label, capped ───────────
  const maxLabelW = chartBox.width * MAX_LABEL_SHARE
  const naturalW = Math.max(...categories.map((c) => ctx.measureText(c, labelStyle).width))
  const labelW = Math.min(maxLabelW, Math.ceil(naturalW))

  const axisH = lineH + AXIS_GAP
  const plot: Box = {
    x: chartBox.x + labelW + LABEL_GAP,
    y: chartBox.y,
    // Leave room for half of the last tick label, which is centred on the plot's right edge.
    width: Math.max(0, chartBox.width - labelW - LABEL_GAP - TICK_LABEL_WIDTH / 2),
    height: Math.max(0, chartBox.height - axisH),
  }

  // ── Scale, ticks ────────────────────────────────────────────────────────────
  const domain = barDomain(series as number[])
  const xScale = linearScale(domain, [plot.x, plot.x + plot.width])
  const ticks = niceTicks(domain, Math.max(2, Math.min(6, Math.floor(plot.width / (TICK_LABEL_WIDTH + 24)))))
  const lineColor = ctx.resolveColor('line').color
  const baseX = xScale(0)

  // Gridlines first (behind the bars), baseline last of the axis.
  for (const t of ticks) {
    if (Math.abs(t) < 1e-10) continue
    const gx = xScale(t)
    children.push({
      k: 'line',
      box: { x: gx, y: plot.y, width: 0, height: plot.height },
      part: `gridline/${t}`,
      from: { x: gx, y: plot.y },
      to: { x: gx, y: plot.y + plot.height },
      stroke: { color: lineColor, width: 0.5 },
    })
  }
  children.push({
    k: 'line',
    box: { x: baseX, y: plot.y, width: 0, height: plot.height },
    part: 'axis/baseline',
    from: { x: baseX, y: plot.y },
    to: { x: baseX, y: plot.y + plot.height },
    stroke: { color: lineColor, width: 1 },
  })
  ticks.forEach((t, i) => {
    const tx = xScale(t)
    const text = formatTickLabel(t)
    // Text nodes are left-aligned inside their box, so size the box to the text and centre that.
    const lw = Math.ceil(ctx.measureText(text, labelStyle).width)
    children.push({
      k: 'text',
      box: { x: tx - lw / 2, y: plot.y + plot.height + AXIS_GAP, width: lw, height: lineH },
      part: `axis/label-${i}`,
      lines: [{ text, baseline: labelStyle.size, width: lw }],
      style: { ...labelStyle },
    })
  })

  // ── Bars and category labels ────────────────────────────────────────────────
  const hasHighlight = highlightIndex >= 0 && highlightIndex < n
  const colors = assignSeriesColors(1, ctx.tokens)
  const bands = bandScale(categories, [plot.y, plot.y + plot.height], BAND_PADDING)
  const thickness = Math.min(bands.bandwidth, MAX_BAR_THICKNESS)

  for (let i = 0; i < n; i++) {
    const cy = bands.center(i)
    const top = cy - thickness / 2
    const value = series[i]

    if (isMissing(value)) {
      children.push({
        k: 'rect',
        box: { x: plot.x, y: top, width: plot.width, height: thickness },
        part: `bar/gap-${i}`,
        stroke: { color: lineColor, width: 1 },
      })
    } else {
      const right = xScale(Math.max(0, value as number))
      children.push({
        k: 'rect',
        box: { x: baseX, y: top, width: Math.abs(right - baseX), height: thickness },
        part: `bar/${i}`,
        fill: { type: 'solid', color: hasHighlight ? highlightColor(i, highlightIndex, colors[0], ctx.tokens) : colors[0] },
      })
    }

    const m = ctx.measureText(categories[i], labelStyle, labelW)
    const lines = clampLines(m.lines, m.lines.length > MAX_LINES)
    const h = lines.length * lineH
    children.push({
      k: 'text',
      box: { x: chartBox.x, y: cy - h / 2, width: labelW, height: h },
      // Unique per category (the vertical chart reuses 'label'); the parity harness matches by part.
      part: `label/${i}`,
      lines,
      style: labelStyle,
    })
  }

  return root(children)
}
