/**
 * tls.c.dashboard — KPI tiles, one chart and an insight note on one slide.
 *
 * `defineCompositeBlock` supplies metadata and `build()` (kpi-row, chart, takeaway); `layout()` places
 * those same specs by hand and flattens them (tile sparklines and chart paths are translated, see
 * `../_kit.ts`). `kpis-top` puts a `tls.c.kpi-row` across the top and chart + insight below;
 * `kpis-left` stacks the tiles in a left column with the chart and the insight on the right. The chart
 * kind picks `tls.d.<kind>` inside the pure `build()`. Hiding the insight gives the chart the width.
 */

import type { BlockDefinition, BlockSchema, BlockSpec, LayoutContext, LayoutNode } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { defineCompositeBlock } from '../../../layout/define-composite'
import { enumSlot } from '../../data/_chart/schema-kit'
import { objs } from '../../media/_kit'
import { composeFlat, measureHeights, pick, toMeasurable, type Piece } from '../_kit'
import { chartSlot, chartSpec, type ChartSlot } from '../_chart'

export const DASH_MIN_KPIS = 2
export const DASH_MAX_KPIS = 4

export interface DashboardProps extends Record<string, unknown> {
  kpis: Array<Record<string, unknown>>
  chart: ChartSlot
  insight?: string
  layout?: 'kpis-top' | 'kpis-left'
  chartRatio?: '2:1' | '1:1'
  showInsight?: boolean
}

export const schema: BlockSchema = {
  kpis: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, role: 'content', label: 'Label', required: true },
          value: { type: { kind: 'number' }, role: 'content', label: 'Value', required: true },
          delta: { type: { kind: 'number' }, role: 'content', label: 'Delta' },
          sparkline: { type: { kind: 'list', of: { kind: 'number' }, min: 2, max: 20 }, role: 'content', label: 'Sparkline' },
          polarity: { type: { kind: 'enum', values: ['upGood', 'downGood'] }, role: 'option', label: 'Polarity' },
          format: { type: { kind: 'enum', values: ['plain', 'compact', 'percent', 'currency'] }, role: 'option', label: 'Format' },
        },
      },
      min: DASH_MIN_KPIS,
      max: DASH_MAX_KPIS,
    },
    role: 'content',
    label: 'KPIs',
    required: true,
    guidance: 'Each: label!, value!, delta, sparkline[], polarity, format.',
  },
  chart: chartSlot(),
  insight: { type: { kind: 'text', maxChars: 160 }, role: 'content', label: 'Insight', guidance: 'One takeaway sentence.' },
  layout: enumSlot(['kpis-top', 'kpis-left'], 'Layout'),
  chartRatio: enumSlot(['2:1', '1:1'], 'Chart share', 'Chart width vs insight width.'),
  showInsight: { type: { kind: 'boolean' }, role: 'option', label: 'Show insight', toggles: 'insight' },
}

export const defaults: DashboardProps = {
  kpis: [
    { label: 'Revenue', value: 4200000, delta: 12.5, format: 'compact', polarity: 'upGood' },
    { label: 'Churn %', value: 3.1, delta: -0.8, format: 'percent', polarity: 'downGood' },
    { label: 'NPS', value: 62, delta: 4, format: 'plain', polarity: 'upGood' },
  ],
  chart: { kind: 'line', categories: ['Jan', 'Feb', 'Mar', 'Apr'], series: [{ name: 'Revenue', values: [3.1, 3.6, 3.9, 4.2] }] },
  insight: 'Revenue grew **four months in a row**; churn is falling.',
  layout: 'kpis-top',
  chartRatio: '2:1',
}

const LAYOUTS = ['kpis-top', 'kpis-left'] as const
const RATIOS = ['2:1', '1:1'] as const

const tilesOf = (props: DashboardProps) => objs(props.kpis).filter((k) => typeof k.label === 'string' && k.label !== '').slice(0, DASH_MAX_KPIS)

const insightSpec = (props: DashboardProps): BlockSpec | undefined =>
  isShown(props, 'showInsight') && props.insight ? { id: 'insight', type: 'tls.t.takeaway', props: { text: toMeasurable(props.insight), label: '', tone: 'accent' } } : undefined

/** Reference tree: stack of kpi-row and a row of chart + takeaway (3 levels). */
export function buildDashboard(props: DashboardProps): BlockSpec {
  const kpis: BlockSpec = { id: 'kpis', type: 'tls.c.kpi-row', props: { tiles: tilesOf(props), gap: 'md' } }
  const chart = chartSpec(props.chart, 'chart')
  const insight = insightSpec(props)
  const lower: BlockSpec = { id: 'lower', type: 'tls.l.row', props: { gap: 'xl', sizing: 'equal', children: insight ? [chart, insight] : [chart] } }
  return { id: 'dashboard', type: 'tls.l.stack', props: { gap: 'md', sizing: 'equal', children: [kpis, lower] } }
}

const KPI_H = 240
const MIN_CHART_H = 300

interface Plan {
  left: boolean
  gap: number
  gapX: number
  insW: number
  chartW: number
  insH: number
  needed: number
  leftW: number
}

function plan(props: DashboardProps, ctx: LayoutContext): Plan {
  const W = Math.max(0, ctx.box.width) || 0
  const left = pick(props.layout, LAYOUTS, 'kpis-top') === 'kpis-left'
  const ratio = pick(props.ratio ?? props.chartRatio, RATIOS, '2:1')
  const gap = ctx.tokens.space.md
  const gapX = ctx.tokens.space.xl
  const ins = insightSpec(props)
  const leftW = left ? Math.round(W * 0.28) : 0
  const areaW = left ? W - leftW - gapX : W
  const share = ratio === '2:1' ? 2 / 3 : 1 / 2
  // kpis-top: chart and insight sit side by side; kpis-left: the insight sits under the chart.
  const insW = !ins ? 0 : left ? areaW : Math.max(0, (areaW - gapX) * (1 - share))
  const chartW = !ins ? areaW : left ? areaW : Math.max(0, (areaW - gapX) * share)
  const insH = ins ? measureHeights(ctx, [ins], insW)[0] : 0
  const n = tilesOf(props).length
  const needed = left
    ? Math.max(n * 200 + gap * Math.max(0, n - 1), MIN_CHART_H + (insH ? insH + gap : 0))
    : KPI_H + gap + Math.max(MIN_CHART_H, insH)
  return { left, gap, gapX, insW, chartW, insH, needed, leftW }
}

export function layoutDashboard(props: DashboardProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const p = plan(props, ctx)
  const total = Math.max(H, p.needed)
  const tiles = tilesOf(props)
  const chart = chartSpec(props.chart, 'chart')
  const ins = insightSpec(props)
  const pieces: Piece[] = []

  if (!p.left) {
    pieces.push({ id: 'kpis', spec: { id: 'kpis', type: 'tls.c.kpi-row', props: { tiles, gap: 'md' } }, box: { x: 0, y: 0, width: W, height: KPI_H } })
    const y = KPI_H + p.gap
    const h = total - y
    pieces.push({ id: 'chart', spec: chart, box: { x: 0, y, width: p.chartW, height: h } })
    if (ins) pieces.push({ id: 'insight', spec: ins, box: { x: p.chartW + p.gapX, y: y + Math.max(0, (h - p.insH) / 2), width: p.insW, height: p.insH } })
  } else {
    const n = Math.max(1, tiles.length)
    const th = Math.max(0, (total - p.gap * (n - 1)) / n)
    tiles.forEach((t, i) => {
      pieces.push({ id: 'kpis', spec: { id: `kpi-${i}`, type: 'tls.c.kpi-tile', props: { ...t } }, box: { x: 0, y: i * (th + p.gap), width: p.leftW, height: th } })
    })
    const x = p.leftW + p.gapX
    const ch = total - (ins ? p.insH + p.gap : 0)
    pieces.push({ id: 'chart', spec: chart, box: { x, y: 0, width: p.chartW, height: ch } })
    if (ins) pieces.push({ id: 'insight', spec: ins, box: { x, y: ch + p.gap, width: p.insW, height: p.insH } })
  }
  return composeFlat(ctx, pieces, total)
}

const composite = defineCompositeBlock<DashboardProps>({
  type: 'tls.c.dashboard',
  name: 'Dashboard',
  family: 'composite',
  tier: 'A',
  summary: 'KPI tiles, one chart and an insight note on one slide.',
  keywords: ['dashboard', 'kpi', 'overview', 'monthly review', 'status', 'results', 'metrics'],
  category: 'metric',
  scope: 'slide',
  shortDescription: 'KPI tiles across the top, one chart below and an insight note',
  related: ['tls.c.chart-insight', 'tls.c.kpi-row'],
  schema,
  defaults,
  size: { preferred: [1600, 800], min: [800, 520] },
  describe: {
    when: 'Performance overview: monthly review, project status, business results.',
    avoid: 'One number: tls.c.big-stat. One chart with an explanation: tls.c.chart-insight.',
    example: {
      id: 'b_dashboard',
      type: 'tls.c.dashboard',
      props: {
        kpis: [
          { label: 'Revenue', value: 4200000, delta: 12.5, format: 'compact' },
          { label: 'NPS', value: 62, delta: 4 },
        ],
        chart: { kind: 'line', categories: ['Jan', 'Feb', 'Mar'], series: [{ name: 'Revenue', values: [3.1, 3.6, 4.2] }] },
        insight: 'Revenue grew every month.',
      },
    },
  },
  motion: { parts: ['root'], preset: 'fade-up' },
  build: buildDashboard,
})

export const tlsCDashboard: BlockDefinition = {
  ...composite,
  intrinsicSize: undefined,
  layout: ((props: DashboardProps, ctx: LayoutContext): LayoutNode => layoutDashboard(props, ctx)) as BlockDefinition['layout'],
}
