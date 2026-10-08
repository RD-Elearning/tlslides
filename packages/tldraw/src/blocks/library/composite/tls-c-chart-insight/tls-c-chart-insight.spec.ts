/**
 * tls.c.chart-insight — every chart kind, sides, ratios, source toggle, depth, intrinsic size.
 */

import { tlsCChartInsight, buildChartInsight } from './index'
import { standardBlockSuite, leavesOf, assertContained, absoluteLeaves } from '../../text/standard-suite'
import { makeCtx } from '../../layout/test-helpers'
import { CHART_KINDS } from '../_chart'
import { depthOk, layoutAt, hasPart, registry, compileInRegion } from '../composite-test'
import { lintParts, specNodes } from '../_kit'
import { assertExampleFits } from '../../data/_chart/chart-test'

standardBlockSuite(tlsCChartInsight, { withRegistry: true, noCapacity: true })

const EX = tlsCChartInsight.describe!.example.props as Record<string, any>
const chartOf = (kind: string) => ({
  kind,
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Web', values: [12, 18, 27, 40] },
    { name: 'App', values: [8, 10, 19, 22] },
  ],
})
const textOf = (tree: any, part: string) =>
  leavesOf(tree, part)
    .filter((l) => l.k === 'text')
    .map((l) => (l.node as any).lines.map((x: any) => x.text).join(''))
    .join('|')

describe('tls.c.chart-insight', () => {
  it('is a group-scope chart composite related to dashboard', () => {
    expect(tlsCChartInsight.scope).toBe('group')
    expect(tlsCChartInsight.category).toBe('chart')
    expect(tlsCChartInsight.describe!.avoid).toContain('tls.c.dashboard')
  })

  it.each(CHART_KINDS.map((k) => [k]))('chart kind %s picks tls.d.%s, lays out with no depth overflow in every side', (kind) => {
    const spec = buildChartInsight({ ...(tlsCChartInsight.defaults as any), chart: chartOf(kind) })
    expect(specNodes(spec).some((s) => s.type === `tls.d.${kind}`)).toBe(true)
    for (const side of ['right', 'left', 'below']) {
      depthOk(tlsCChartInsight, buildChartInsight, { chart: chartOf(kind), side }, 1500, 560)
      const t = layoutAt(tlsCChartInsight, { chart: chartOf(kind), side }, 1500, 560)
      expect(hasPart(t, 'chart')).toBe(true)
      expect(lintParts(t)).toEqual([])
    }
  })

  it.each(CHART_KINDS.map((k) => [k]))('DOM and SVG agree for a %s chart', async (kind) => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(tlsCChartInsight, { ...(tlsCChartInsight.defaults as any), chart: chartOf(kind) }, { width: 960, height: 540 }, undefined, { registry: registry() })
  }, 60000)

  it('the source toggle removes exactly the source line', () => {
    const on = layoutAt(tlsCChartInsight, { ...EX, showSource: true }, 1500, 560)
    const off = layoutAt(tlsCChartInsight, { ...EX, showSource: false }, 1500, 560)
    expect(hasPart(on, 'source')).toBe(true)
    expect(hasPart(off, 'source')).toBe(false)
    expect(hasPart(off, 'insight') && hasPart(off, 'chart')).toBe(true)
  })

  it('side places the insight right, left or below the chart; ratio changes the chart share', () => {
    const edge = (side: string, ratio = '2:1') => {
      const t = layoutAt(tlsCChartInsight, { ...EX, side, ratio }, 1500, 560)
      const ins = leavesOf(t, 'insight').filter((l) => l.k === 'text')
      return { insX: Math.min(...ins.map((l) => l.x)), insY: Math.min(...ins.map((l) => l.y)), t }
    }
    expect(edge('right').insX).toBeGreaterThan(900)
    expect(edge('left').insX).toBeLessThan(100)
    expect(edge('below').insY).toBeGreaterThan(300)
    expect(edge('right', '1:1').insX).toBeLessThan(edge('right', '2:1').insX)
  })

  it('shows the insight text and title, and stays inside the box', () => {
    for (const side of ['right', 'left', 'below']) {
      const t = layoutAt(tlsCChartInsight, { ...EX, side, insightTitle: 'Key insight' }, 1500, 560)
      expect(textOf(t, 'insight')).toContain('doubled')
      assertContained(t, { width: 1500, height: 560 })
    }
  })

  it('intrinsicSize grows with the insight length and the root grows when the box is too short', () => {
    const ctx = makeCtx({ width: 1500, height: 900 }, registry())
    const a = tlsCChartInsight.intrinsicSize!({ ...EX, insight: 'Short.', side: 'below' } as any, ctx)
    const b = tlsCChartInsight.intrinsicSize!({ ...EX, insight: 'word '.repeat(40), side: 'below' } as any, ctx)
    expect(b.height).toBeGreaterThan(a.height)
    expect(layoutAt(tlsCChartInsight, { ...EX, side: 'below' }, 1500, 200).box.height).toBeGreaterThan(200)
  })

  it('compiles in a region, inside the frame', () => {
    const { rects, frame } = compileInRegion(tlsCChartInsight, EX, 'timeline', 'timeline')
    expect(rects).toHaveLength(1)
    expect(rects[0].bottom).toBeLessThanOrEqual(frame.height + 1)
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsCChartInsight)
  })

  it('a half-width box puts the takeaway under the chart with a readable measure; a wide box keeps it beside', () => {
    const reg = registry()
    const props = { ...(tlsCChartInsight.defaults as any), ...(tlsCChartInsight.describe!.example.props as any) }
    const narrow = tlsCChartInsight.layout(props, makeCtx({ width: 860, height: 760 }, reg))
    const sentenceOf = (t: any) =>
      absoluteLeaves(t).filter((l) => l.k === 'text' && ((l.node as any).lines ?? []).some((x: any) => /doubled/.test(x.text)))[0]
    const sentence = sentenceOf(narrow)
    expect(sentence).toBeDefined()
    const chartBottom = Math.max(...absoluteLeaves(narrow).filter((l) => /^(series|grid|cat|ytick)/.test(l.part ?? '')).map((l) => l.y + l.height))
    expect(sentence.y).toBeGreaterThanOrEqual(chartBottom - 2)
    expect(sentence.width).toBeGreaterThan(500)
    const wide = tlsCChartInsight.layout(props, makeCtx({ width: 1500, height: 560 }, reg))
    const wideSentence = sentenceOf(wide)
    expect(wideSentence.x).toBeGreaterThan(900)
  })
})
