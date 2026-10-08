/**
 * tls.d.grouped-bar — geometry, orientation, labels, hues, highlight, negatives, capacity.
 */

import { tlsDGroupedBar } from './index'
import { absoluteLeaves, leavesOf, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, coloursOf, isNoData, layoutOf, seriesOf, textsOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 900, height: 520 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDGroupedBar, props, size)
const cats = ['A', 'B', 'C']
const bar = (tree: any, s: number, c: number) => leavesOf(tree, `bar[${s}][${c}]`).filter((l) => l.part === `bar[${s}][${c}]`)[0]

standardBlockSuite(tlsDGroupedBar, { overflowProps: { series: seriesOf(5, 3), categories: cats } })

describe('tls.d.grouped-bar', () => {
  it('empty and all-zero data render "No data"', () => {
    expect(isNoData(lay({ series: [] }))).toBe(true)
    expect(isNoData(lay({ categories: cats, series: [{ name: 'a', values: [0, 0, 0] }, { name: 'b', values: [0, 0, 0] }] }))).toBe(true)
  })

  it('bar heights are proportional to the values and share the zero baseline', () => {
    const t = lay({ categories: cats, series: [{ name: 'a', values: [10, 20, 40] }, { name: 'b', values: [20, 20, 20] }] })
    const h = (s: number, c: number) => bar(t, s, c).height
    expect(h(0, 1) / h(0, 0)).toBeCloseTo(2, 1)
    expect(h(0, 2) / h(0, 0)).toBeCloseTo(4, 1)
    const bottoms = [bar(t, 0, 0), bar(t, 1, 2), bar(t, 0, 2)].map((l) => Math.round(l.y + l.height))
    expect(new Set(bottoms).size).toBe(1)
  })

  it('bars of one category sit side by side, in series order, inside their band', () => {
    const t = lay({ categories: cats, series: seriesOf(3, 3) })
    for (let c = 0; c < 3; c++) {
      const bs = [0, 1, 2].map((s) => bar(t, s, c))
      for (let i = 1; i < 3; i++) expect(bs[i].x).toBeGreaterThanOrEqual(bs[i - 1].x + bs[i - 1].width - 0.01)
    }
  })

  it('groupGap lg leaves more room between groups than sm', () => {
    const gapBetween = (groupGap: string) => {
      const t = lay({ categories: cats, series: seriesOf(2, 3), groupGap })
      return bar(t, 0, 1).x - (bar(t, 1, 0).x + bar(t, 1, 0).width)
    }
    expect(gapBetween('lg')).toBeGreaterThan(gapBetween('sm'))
  })

  it('a single series uses the accent role; four series use four distinct hues', () => {
    const c = chartCtx(SZ)
    expect(coloursOf(lay({ categories: cats, series: seriesOf(1, 3) }), /^bar\[0\]\[0\]$/)[0]).toBe(c.resolveColor('accent').color)
    const four = lay({ categories: cats, series: seriesOf(4, 3) })
    const cols = [0, 1, 2, 3].map((s) => coloursOf(four, new RegExp(`^bar\\[${s}\\]\\[0\\]$`))[0])
    expect(new Set(cols).size).toBe(4)
    for (const col of cols) expect(col).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('legend lists every series; a single series has none', () => {
    const legend = (t: any) => absoluteLeaves(t).filter((l) => (l.part ?? '').startsWith('legend/label')).length
    expect(legend(lay({ categories: cats, series: seriesOf(3, 3) }))).toBe(3)
    expect(legend(lay({ categories: cats, series: seriesOf(1, 3) }))).toBe(0)
    expect(legend(lay({ categories: cats, series: seriesOf(3, 3), legend: 'none' }))).toBe(0)
  })

  it('highlightIndex keeps one category in colour and dims the rest', () => {
    const base = lay({ categories: cats, series: seriesOf(2, 3) })
    const hl = lay({ categories: cats, series: seriesOf(2, 3), highlightIndex: 1 })
    expect(coloursOf(hl, /^bar\[0\]\[1\]$/)[0]).toBe(coloursOf(base, /^bar\[0\]\[1\]$/)[0])
    expect(coloursOf(hl, /^bar\[0\]\[0\]$/)[0]).not.toBe(coloursOf(base, /^bar\[0\]\[0\]$/)[0])
  })

  it('negative values hang below the baseline', () => {
    const t = lay({ categories: cats, series: [{ name: 'a', values: [10, -8, 5] }, { name: 'b', values: [4, 6, -2] }] })
    assertChartSane(t, SZ)
    const pos = bar(t, 0, 0)
    const neg = bar(t, 0, 1)
    expect(neg.y).toBeGreaterThanOrEqual(pos.y + pos.height - 0.5)
  })

  it('null values leave a gap (no bar), never a zero-height bar', () => {
    const t = lay({ categories: cats, series: [{ name: 'a', values: [10, null, 5] }, { name: 'b', values: [4, 6, 2] }] })
    expect(leavesOf(t, 'bar[0][1]').filter((l) => l.part === 'bar[0][1]')).toHaveLength(0)
  })

  it('horizontal: bars run left to right, category labels sit left of the bars', () => {
    const t = lay({ categories: ['Alpha', 'Beta', 'Gamma'], series: seriesOf(2, 3), orientation: 'horizontal' })
    assertChartSane(t, SZ)
    const b = bar(t, 0, 0)
    expect(b.width).toBeGreaterThan(b.height)
    const label = leavesOf(t, 'cat[0]')[0]
    expect(label.x + label.width).toBeLessThanOrEqual(b.x + 1)
  })

  it('valueLabels end prints a label per bar when they fit, and none when they would not', () => {
    const count = (t: any) => absoluteLeaves(t).filter((l) => /\.value$/.test(l.part ?? '')).length
    expect(count(lay({ categories: cats, series: seriesOf(2, 3), valueLabels: 'end' }))).toBe(6)
    const crowded = lay({ categories: Array.from({ length: 12 }, (_, i) => `c${i}`), series: seriesOf(4, 12), valueLabels: 'end', format: 'currency' }, { width: 500, height: 400 })
    expect(count(crowded)).toBe(0)
    assertChartSane(crowded, { width: 500, height: 400 })
  })

  it('valueLabels inside sits within the bar', () => {
    const t = lay({ categories: cats, series: [{ name: 'a', values: [40, 50, 60] }, { name: 'b', values: [30, 20, 10] }], valueLabels: 'inside' })
    const l = leavesOf(t, 'bar[0][0].value')[0]
    const b = bar(t, 0, 0)
    expect(l.y).toBeGreaterThanOrEqual(b.y - 0.5)
    expect(l.y + l.height).toBeLessThanOrEqual(b.y + b.height + 0.5)
  })

  it('long category labels wrap or thin out in both orientations without overlap', () => {
    const long = Array.from({ length: 8 }, (_, i) => `Regional operating unit ${i + 1}`)
    for (const orientation of ['vertical', 'horizontal']) {
      const t = lay({ categories: long, series: seriesOf(2, 8), orientation }, { width: 640, height: 420 })
      assertChartSane(t, { width: 640, height: 420 })
    }
  })

  it('keeps every category label (clipped when too long)', () => {
    const long = ['Operations', 'Engineering', 'Administration', 'Procurement']
    const t = lay({ categories: long, series: seriesOf(2, 4) }, { width: 480, height: 360 })
    for (let i = 0; i < 4; i++) expect(absoluteLeaves(t).some((l) => (l.part ?? '').startsWith(`cat[${i}]`))).toBe(true)
    assertChartSane(t, { width: 480, height: 360 })
  })

  it('format compact shows K on the axis', () => {
    const t = lay({ categories: cats, series: [{ name: 'a', values: [12000, 8000, 5000] }, { name: 'b', values: [1000, 2000, 3000] }], format: 'compact' })
    expect(textsOf(t).some((s) => /K$/.test(s))).toBe(true)
  })

  it('capacity: more than 4 series fails with truncate series', () => {
    const r = tlsDGroupedBar.capacity!({ categories: cats, series: seriesOf(5, 3) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
    expect(r.remedy).toEqual([{ kind: 'truncate', slot: 'series' }])
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDGroupedBar)
  })
})
