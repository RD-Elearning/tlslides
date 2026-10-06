/**
 * tls.c.chart-insight — a chart with its message stated beside it: takeaway panel and a source line.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (stack/row of chart, takeaway, footnote);
 * `layout()` places the same specs by hand and flattens them (chart paths are translated, see
 * `../_kit.ts`), so the DOM/SVG probe passes and the tree is 1 level deep. The chart kind picks the
 * child block inside the pure `build()`: bar, line, area, donut, stacked-bar, grouped-bar, pie.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { composeFlat, measureHeights, pick, toMeasurable, type Piece } from '../_kit'
import { chartSlot, chartSpec, type ChartSlot } from '../_chart'

export interface ChartInsightProps extends Record<string, unknown> {
  chart: ChartSlot
  insight: string
  insightTitle?: string
  source?: string
  side?: 'right' | 'left' | 'below'
  ratio?: '2:1' | '3:2' | '1:1'
  showSource?: boolean
}

export const schema: BlockSchema = {
  chart: chartSlot(),
  insight: { type: { kind: 'richText', maxChars: 200 }, role: 'content', label: 'Insight', required: true, guidance: 'The message of the chart in 1-2 sentences.' },
  insightTitle: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Insight title', guidance: '"Key insight".' },
  source: { type: { kind: 'text', maxChars: 120 }, role: 'content', label: 'Source' },
  side: enumSlot(['right', 'left', 'below'], 'Insight side'),
  ratio: enumSlot(['2:1', '3:2', '1:1'], 'Chart share', 'Chart width : insight width.'),
  showSource: { type: { kind: 'boolean' }, role: 'option', label: 'Show source', toggles: 'source' },
}

export const defaults: ChartInsightProps = {
  chart: {
    kind: 'line',
    categories: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [{ name: 'Revenue', values: [12, 18, 27, 40] }],
  },
  insight: 'Revenue **more than tripled** after the launch in Q2.',
  insightTitle: 'Key insight',
  source: 'Source: company finance report, 2025',
  side: 'right',
  ratio: '2:1',
}

const SIDES = ['right', 'left', 'below'] as const
const RATIOS = ['2:1', '3:2', '1:1'] as const
const SHARE: Record<(typeof RATIOS)[number], number> = { '2:1': 2 / 3, '3:2': 3 / 5, '1:1': 1 / 2 }

function insightSpec(props: ChartInsightProps): BlockSpec {
  return {
    id: 'insight',
    type: 'tls.t.takeaway',
    props: { text: toMeasurable(props.insight), label: props.insightTitle ?? '', tone: 'accent' },
  }
}

function sourceSpec(props: ChartInsightProps): BlockSpec | undefined {
  return isShown(props, 'showSource') && props.source
    ? { id: 'source', type: 'tls.t.footnote', props: { items: [props.source], marker: 'none' } }
    : undefined
}

/** Reference tree: stack/row of chart, takeaway and footnote (2 levels). */
export function buildChartInsight(props: ChartInsightProps): BlockSpec {
  const side = pick(props.side, SIDES, 'right')
  const chart = chartSpec(props.chart, 'chart')
  const insight = insightSpec(props)
  const main: BlockSpec = {
    id: 'main',
    type: side === 'below' ? 'tls.l.stack' : 'tls.l.row',
    props: { gap: 'xl', sizing: 'equal', children: side === 'left' ? [insight, chart] : [chart, insight] },
  }
  const source = sourceSpec(props)
  return { id: 'chart-insight', type: 'tls.l.stack', props: { gap: 'md', sizing: 'content', children: source ? [main, source] : [main] } }
}

interface Plan {
  side: (typeof SIDES)[number]
  gapX: number
  chartW: number
  insW: number
  insH: number
  srcH: number
  needed: number
}

const MIN_CHART_H = 300

/** A side panel narrower than this wraps its sentence word by word: put it under the chart instead. */
const MIN_SIDE_W = 380

function plan(props: ChartInsightProps, ctx: LayoutContext): Plan {
  const W = Math.max(0, ctx.box.width) || 0
  const wanted = pick(props.side, SIDES, 'right')
  const ratio = pick(props.ratio, RATIOS, '2:1')
  const gapX = ctx.tokens.space.xl
  // Reflow (RV05): in a half-width region the beside layout left the takeaway a 220-wide column
  // ("Users / doubled in / two / quarters."); below the chart it keeps a readable measure.
  const sideInsW = Math.max(0, W - gapX - Math.max(0, (W - gapX) * SHARE[ratio]))
  const side = wanted !== 'below' && sideInsW < MIN_SIDE_W ? 'below' : wanted
  const below = side === 'below'
  const chartW = below ? W : Math.max(0, (W - gapX) * SHARE[ratio])
  const insW = below ? W : Math.max(0, W - gapX - chartW)
  const src = sourceSpec(props)
  const [insH] = measureHeights(ctx, [insightSpec(props)], insW)
  const srcH = src ? measureHeights(ctx, [src], W)[0] : 0
  const body = below ? MIN_CHART_H + ctx.tokens.space.xl + insH : Math.max(MIN_CHART_H, insH)
  return { side, gapX, chartW, insW, insH, srcH, needed: body + (srcH ? srcH + ctx.tokens.space.md : 0) }
}

export function layoutChartInsight(props: ChartInsightProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const p = plan(props, ctx)
  const total = Math.max(H, p.needed)
  const gap = ctx.tokens.space.md
  const mainH = total - (p.srcH ? p.srcH + gap : 0)
  const chart = chartSpec(props.chart, 'chart')
  const insight = insightSpec(props)
  const pieces: Piece[] = []
  if (p.side === 'below') {
    const chartH = Math.max(0, mainH - p.insH - ctx.tokens.space.xl)
    pieces.push({ id: 'chart', spec: chart, box: { x: 0, y: 0, width: W, height: chartH } })
    pieces.push({ id: 'insight', spec: insight, box: { x: 0, y: chartH + ctx.tokens.space.xl, width: W, height: p.insH } })
  } else {
    const chartX = p.side === 'right' ? 0 : p.insW + p.gapX
    const insX = p.side === 'right' ? p.chartW + p.gapX : 0
    pieces.push({ id: 'chart', spec: chart, box: { x: chartX, y: 0, width: p.chartW, height: mainH } })
    pieces.push({ id: 'insight', spec: insight, box: { x: insX, y: Math.max(0, (mainH - p.insH) / 2), width: p.insW, height: p.insH } })
  }
  const src = sourceSpec(props)
  if (src) pieces.push({ id: 'source', spec: src, box: { x: 0, y: total - p.srcH, width: W, height: p.srcH } })
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<ChartInsightProps>({
  type: 'tls.c.chart-insight',
  name: 'Chart with Insight',
  family: 'composite',
  tier: 'A',
  summary: 'Chart with its key message in a takeaway panel and a source line.',
  keywords: ['chart', 'insight', 'takeaway', 'explained chart', 'so what', 'annotated chart', 'source'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Chart with a highlighted takeaway beside it and a source line',
  related: ['tls.c.dashboard', 'tls.t.takeaway'],
  schema,
  defaults,
  size: { preferred: [1500, 560], min: [960, 540] },
  describe: {
    when: 'A chart whose message must be stated explicitly ("Revenue doubled after launch"). The takeaway sits beside the chart, or under it in a narrow region.',
    avoid: 'Several KPIs: tls.c.dashboard. A bare chart: tls.d.line or tls.d.bar.',
    example: {
      id: 'b_chart_insight',
      type: 'tls.c.chart-insight',
      props: {
        chart: { kind: 'line', categories: ['Q1', 'Q2', 'Q3'], series: [{ name: 'Users', values: [12, 18, 27] }] },
        insight: 'Users **doubled** in two quarters.',
        source: 'Source: product analytics',
      },
    },
  },
  motion: { parts: ['root'], preset: 'fade-up' },
  build: buildChartInsight,
})

export const tlsCChartInsight: BlockDefinition = {
  ...composite,
  layout: ((props: ChartInsightProps, ctx: LayoutContext): LayoutNode => layoutChartInsight(props, ctx)) as BlockDefinition['layout'],
  intrinsicSize: ((props: ChartInsightProps, ctx: LayoutContext): Size => ({
    width: Math.max(0, ctx.box.width),
    height: Math.max(1, Math.ceil(plan(props, ctx).needed)),
  })) as BlockDefinition['intrinsicSize'],
}
