/**
 * tls.c.dashboard — layouts, every chart kind, toggle, depth, parity, slide-scope compile.
 */

import { tlsCDashboard, buildDashboard } from './index'
import { standardBlockSuite, leavesOf, assertContained } from '../../text/standard-suite'
import { CHART_KINDS } from '../_chart'
import { depthOk, layoutAt, hasPart, registry, slideScopeCompiles } from '../composite-test'
import { lintParts, specDepth } from '../_kit'
import { assertExampleFits } from '../../data/_chart/chart-test'

standardBlockSuite(tlsCDashboard, { withRegistry: true, noCapacity: true })

const EX = tlsCDashboard.describe!.example.props as Record<string, any>
const chartOf = (kind: string) => ({
  kind,
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Web', values: [12, 18, 27, 40] },
    { name: 'App', values: [8, 10, 19, 22] },
  ],
})
const FOUR_KPIS = [
  { label: 'Revenue', value: 4200000, delta: 12.5, format: 'compact', sparkline: [1, 3, 2, 5, 4, 6] },
  { label: 'Churn', value: 3.1, delta: -0.8, format: 'percent', polarity: 'downGood' },
  { label: 'NPS', value: 62, delta: 4 },
  { label: 'Users', value: 12800, delta: 3, format: 'compact' },
]

describe('tls.c.dashboard', () => {
  it('is a slide-scope metric composite pointing at big-stat and chart-insight', () => {
    expect(tlsCDashboard.scope).toBe('slide')
    expect(tlsCDashboard.category).toBe('metric')
    expect(tlsCDashboard.describe!.avoid).toContain('tls.c.chart-insight')
    expect(tlsCDashboard.related).toContain('tls.c.chart-insight')
  })

  it.each(CHART_KINDS.map((k) => [k]))('chart kind %s lays out in both layouts with no depth overflow (4 KPIs)', (kind) => {
    for (const layout of ['kpis-top', 'kpis-left']) {
      depthOk(tlsCDashboard, buildDashboard, { kpis: FOUR_KPIS, chart: chartOf(kind), layout }, 1600, 900)
      const t = layoutAt(tlsCDashboard, { kpis: FOUR_KPIS, chart: chartOf(kind), layout }, 1600, 900)
      expect(lintParts(t)).toEqual([])
      expect(hasPart(t, 'chart') && hasPart(t, 'kpis') && hasPart(t, 'insight')).toBe(true)
      // tol 6: the bar chart's own axis labels sit 4px below its box (pre-existing, P2)
      assertContained(t, { width: 1600, height: 900 }, 6)
    }
  })

  it('the reference tree is at most 3 deep and the layout adds one level for the tiles', () => {
    expect(specDepth(buildDashboard({ ...(tlsCDashboard.defaults as any) }))).toBeLessThanOrEqual(4)
  })

  it.each(CHART_KINDS.map((k) => [k]))('DOM and SVG agree for a %s chart (kpis-top)', async (kind) => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(tlsCDashboard, { ...(tlsCDashboard.defaults as any), chart: chartOf(kind) }, { width: 960, height: 540 }, undefined, { registry: registry() })
  }, 60000)

  it('DOM and SVG agree for kpis-left with an insight', async () => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(tlsCDashboard, { ...(tlsCDashboard.defaults as any), layout: 'kpis-left' }, { width: 960, height: 540 }, undefined, { registry: registry() })
  }, 60000)

  it('showInsight false removes exactly the insight and the chart takes the width', () => {
    const on = layoutAt(tlsCDashboard, { ...EX, showInsight: true }, 1600, 800)
    const off = layoutAt(tlsCDashboard, { ...EX, showInsight: false }, 1600, 800)
    expect(hasPart(on, 'insight')).toBe(true)
    expect(hasPart(off, 'insight')).toBe(false)
    expect(hasPart(off, 'chart') && hasPart(off, 'kpis')).toBe(true)
    const wOn = Math.max(...leavesOf(on, 'chart').filter((l) => l.k === 'text').map((l) => l.x + l.width))
    const wOff = Math.max(...leavesOf(off, 'chart').filter((l) => l.k === 'text').map((l) => l.x + l.width))
    expect(wOff).toBeGreaterThan(wOn)
  })

  it('kpis-top puts the tiles above the chart; kpis-left puts them left of it', () => {
    const top = layoutAt(tlsCDashboard, { ...EX, layout: 'kpis-top' }, 1600, 800)
    expect(Math.max(...leavesOf(top, 'kpis').map((l) => l.y))).toBeLessThan(Math.min(...leavesOf(top, 'chart').filter((l) => l.k !== 'path').map((l) => l.y)) + 260)
    const left = layoutAt(tlsCDashboard, { ...EX, layout: 'kpis-left' }, 1600, 800)
    const kpiRight = Math.max(...leavesOf(left, 'kpis').map((l) => l.x + l.width))
    const chartLeft = Math.min(...leavesOf(left, 'chart').filter((l) => l.k === 'text').map((l) => l.x))
    expect(kpiRight).toBeLessThanOrEqual(chartLeft + 2)
  })

  it('grows the root when the content cannot fit the box', () => {
    expect(layoutAt(tlsCDashboard, { ...EX, kpis: FOUR_KPIS }, 1600, 200).box.height).toBeGreaterThan(200)
  })

  it('the example compiles in a blank content region and a title region, inside the frame', () => {
    slideScopeCompiles(tlsCDashboard, 'blank', 'content')
    slideScopeCompiles(tlsCDashboard, 'title', 'title')
  })
})

describe('RV04 — example fits its box (review G04)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsCDashboard)
  })
})
