/**
 * tls.d.stacked-bar — stacking maths, normalize, totals, orientation, hues, highlight.
 */

import { tlsDStackedBar } from './index'
import { absoluteLeaves, leavesOf, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, coloursOf, isNoData, layoutOf, seriesOf, textsOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 900, height: 520 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDStackedBar, props, size)
const cats = ['A', 'B', 'C']
const seg = (tree: any, s: number, c: number) => leavesOf(tree, `seg[${s}][${c}]`).filter((l) => l.part === `seg[${s}][${c}]`)[0]

standardBlockSuite(tlsDStackedBar, { overflowProps: { series: seriesOf(7, 3), categories: cats } })

describe('tls.d.stacked-bar', () => {
  it('empty and all-zero data render "No data"', () => {
    expect(isNoData(lay({ series: [] }))).toBe(true)
    expect(isNoData(lay({ categories: cats, series: [{ name: 'a', values: [0, 0, 0] }, { name: 'b', values: [0, 0, 0] }] }))).toBe(true)
  })

  it('segments stack without gaps or overlap: segment 1 starts where segment 0 ends', () => {
    const t = lay({ categories: cats, series: seriesOf(3, 3), totals: false })
    for (let c = 0; c < 3; c++) {
      const a = seg(t, 0, c)
      const b = seg(t, 1, c)
      const d = seg(t, 2, c)
      expect(Math.abs(b.y + b.height - a.y)).toBeLessThan(0.1)
      expect(Math.abs(d.y + d.height - b.y)).toBeLessThan(0.1)
    }
  })

  it('segment heights are proportional to their values', () => {
    const t = lay({ categories: cats, series: [{ name: 'a', values: [10, 20, 30] }, { name: 'b', values: [20, 20, 20] }] })
    expect(seg(t, 0, 1).height / seg(t, 0, 0).height).toBeCloseTo(2, 1)
    expect(seg(t, 1, 0).height / seg(t, 0, 0).height).toBeCloseTo(2, 1)
  })

  it('normalize scales every bar to the same full height (100%)', () => {
    const t = lay({ categories: cats, series: [{ name: 'a', values: [10, 40, 5] }, { name: 'b', values: [30, 10, 15] }], normalize: true, totals: false })
    const tops = [0, 1, 2].map((c) => Math.round(seg(t, 1, c).y))
    expect(new Set(tops).size).toBe(1)
    expect(textsOf(t)).toContain('100%')
  })

  it('totals print the sum above each bar, and can be switched off', () => {
    const s = [{ name: 'a', values: [10, 20, 30] }, { name: 'b', values: [5, 5, 5] }]
    expect(textsOf(lay({ categories: cats, series: s, totals: true }))).toEqual(expect.arrayContaining(['15', '25', '35']))
    const off = absoluteLeaves(lay({ categories: cats, series: s, totals: false })).filter((l) => /^total\[/.test(l.part ?? ''))
    expect(off).toHaveLength(0)
  })

  it('negative values stack below the baseline separately from positives', () => {
    const t = lay({ categories: cats, series: [{ name: 'a', values: [10, -6, 4] }, { name: 'b', values: [5, -4, -2] }], totals: false })
    assertChartSane(t, SZ)
    const up = seg(t, 0, 0)
    const down = seg(t, 0, 1)
    expect(down.y).toBeGreaterThanOrEqual(up.y + up.height - 0.5)
  })

  it('valueLabels inside labels the segments that are big enough', () => {
    const t = lay({ categories: cats, series: [{ name: 'a', values: [40, 50, 1] }, { name: 'b', values: [30, 20, 60] }], valueLabels: 'inside', totals: false })
    const l = leavesOf(t, 'seg[0][0].value')[0]
    const b = seg(t, 0, 0)
    expect(l.y).toBeGreaterThanOrEqual(b.y - 0.5)
    expect(l.y + l.height).toBeLessThanOrEqual(b.y + b.height + 0.5)
    expect(leavesOf(t, 'seg[0][2].value')).toHaveLength(0)
  })

  it('six series use six distinct hues', () => {
    const t = lay({ categories: cats, series: seriesOf(6, 3), totals: false })
    const cols = [0, 1, 2, 3, 4, 5].map((s) => coloursOf(t, new RegExp(`^seg\\[${s}\\]\\[0\\]$`))[0])
    expect(new Set(cols).size).toBe(6)
    for (const col of cols) expect(col).toMatch(/^#[0-9a-f]{6}$/i)
    assertChartSane(t, SZ)
  })

  it('highlightIndex keeps one category in colour and dims the rest', () => {
    const base = lay({ categories: cats, series: seriesOf(2, 3) })
    const hl = lay({ categories: cats, series: seriesOf(2, 3), highlightIndex: 2 })
    expect(coloursOf(hl, /^seg\[0\]\[2\]$/)[0]).toBe(coloursOf(base, /^seg\[0\]\[2\]$/)[0])
    expect(coloursOf(hl, /^seg\[0\]\[0\]$/)[0]).not.toBe(coloursOf(base, /^seg\[0\]\[0\]$/)[0])
  })

  it('a single series uses the accent role and no legend', () => {
    const c = chartCtx(SZ)
    const t = lay({ categories: cats, series: seriesOf(1, 3) })
    expect(coloursOf(t, /^seg\[0\]\[0\]$/)[0]).toBe(c.resolveColor('accent').color)
    expect(absoluteLeaves(t).some((l) => (l.part ?? '').startsWith('legend'))).toBe(false)
  })

  it('horizontal: segments run left to right in order', () => {
    const t = lay({ categories: cats, series: seriesOf(3, 3), orientation: 'horizontal' })
    assertChartSane(t, SZ)
    const a = seg(t, 0, 0)
    const b = seg(t, 1, 0)
    expect(Math.abs(a.x + a.width - b.x)).toBeLessThan(0.1)
    expect(b.x).toBeGreaterThan(a.x)
    expect(b.y).toBeCloseTo(a.y, 0)
  })

  it('long labels wrap or thin out in both orientations without overlap', () => {
    const long = Array.from({ length: 8 }, (_, i) => `Regional operating unit ${i + 1}`)
    for (const orientation of ['vertical', 'horizontal']) {
      const t = lay({ categories: long, series: seriesOf(3, 8), orientation }, { width: 640, height: 420 })
      assertChartSane(t, { width: 640, height: 420 })
    }
  })

  it('capacity: more than 6 series fails with truncate series', () => {
    const r = tlsDStackedBar.capacity!({ categories: cats, series: seriesOf(7, 3) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
    expect(r.remedy).toEqual([{ kind: 'truncate', slot: 'series' }])
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDStackedBar)
  })
})
