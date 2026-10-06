/**
 * Pure layout for tls.d.bar — one series as columns (or horizontal bars) on a zero baseline.
 *
 * RV05 (review G05): the first bar chart used its own pre-P2 geometry (gridlines as `line` nodes the
 * DOM renderer does not draw, bars clamped to 75% of the plot and re-centred 190 units away from
 * the axis, category labels left-aligned under the bars, the last label below the box). It now
 * shares the engine of `tls.d.grouped-bar` (`_chart/bar-family`): gridlines and baseline as thin
 * rects, labels centred on their band and thinned or clipped by real widths, value labels above
 * the bars, null / NaN values leave a gap (never a zero), one highlighted bar in `accent` with the
 * rest dimmed. The title sits above the chart.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { BarChartProps } from './schema'
import { barFamilyLayout } from '../_chart/bar-family'
import { asArr, lineH, oneLine, realWidth, str, style, withRealWidths } from '../_chart/kit'

/** Gap between the title and the chart (slide units). */
const TITLE_GAP = 8

function shift(node: LayoutNode, dy: number): LayoutNode {
  const moved = { ...node, box: { ...node.box, y: node.box.y + dy } } as LayoutNode
  return moved.k === 'group' ? { ...moved, children: moved.children.map((c) => shift(c, dy)) } : moved
}

export function layout(props: BarChartProps, ctx0: LayoutContext): LayoutNode {
  const ctx = withRealWidths(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const categories = asArr<unknown>(props.categories).map(str)
  const title = str(props.title).trim()

  let titleNode: LayoutNode | undefined
  let titleH = 0
  if (title && categories.length > 0) {
    // The title shrinks (to 0.55) before it is clipped: a narrow chart keeps its whole title.
    const base = style(ctx, 'subheading', ctx.resolveColor('text').color)
    const k = Math.min(1, Math.max(0.55, (W * 0.98) / Math.max(1, realWidth(title, base))))
    const ts = k < 1 ? { ...base, size: base.size * k } : base
    titleNode = oneLine(ctx, title, ts, { x: 0, y: 0, width: W }, 'title')
    titleH = lineH(ts)
  }
  const gap = titleNode ? TITLE_GAP : 0
  const inner: LayoutContext = { ...ctx, box: { width: W, height: Math.max(0, H - titleH - gap) } }
  const chart = barFamilyLayout(
    'grouped',
    {
      categories,
      series: asArr<unknown>(props.series) as never,
      orientation: props.orientation === 'horizontal' ? 'horizontal' : 'vertical',
      highlightIndex: props.highlightIndex,
      valueLabels: props.valueLabels === 'none' ? 'none' : 'end',
      legend: 'none',
      gridlines: 'major',
    },
    inner
  )
  if (!titleNode || chart.k !== 'group') return { ...chart, box: { x: 0, y: 0, width: W, height: H } }
  return {
    ...chart,
    box: { x: 0, y: 0, width: W, height: H },
    children: [titleNode, ...chart.children.map((c) => shift(c, titleH + gap))],
  }
}
