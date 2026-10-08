/**
 * tls.d.line — gaps, end labels, markers, baseline, hues, highlight, long labels, capacity.
 */

import { tlsDLine } from './index'
import { absoluteLeaves, leavesOf, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, coloursOf, isNoData, layoutOf, seriesOf, textsOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 900, height: 520 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDLine, props, size)
const cats = ['A', 'B', 'C', 'D', 'E']

standardBlockSuite(tlsDLine, { overflowProps: { series: seriesOf(7, 5), categories: cats } })

describe('tls.d.line', () => {
  it('empty and all-zero data render "No data", not NaN geometry', () => {
    expect(isNoData(lay({ series: [] }))).toBe(true)
    expect(isNoData(lay({ categories: [], series: [{ name: 'x', values: [] }] }))).toBe(true)
    expect(isNoData(lay({ categories: cats, series: [{ name: 'x', values: [0, 0, 0, 0, 0] }] }))).toBe(true)
    expect(isNoData(lay({ categories: ['only'], series: [{ name: 'x', values: [5] }] }))).toBe(true)
  })

  it('a null value breaks the line into two segments (a gap, never a drop to 0)', () => {
    const tree = lay({ categories: cats, series: [{ name: 'x', values: [10, 20, null, 30, 40] }], endLabels: false })
    const paths = absoluteLeaves(tree).filter((l) => l.k === 'path' && /^series\[0\]/.test(l.part ?? ''))
    expect(paths).toHaveLength(2)
    for (const p of paths) expect((p.node as any).d).not.toMatch(/NaN/)
    // Neither segment visits y of value 0: the lowest y of each is above the baseline.
    const base = leavesOf(tree, 'grid[0]')[0].y
    for (const p of paths) {
      const ys = [...(p.node as any).d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => Number(m[2]))
      expect(Math.max(...ys)).toBeLessThan(base)
    }
  })

  it('a lone point between gaps is drawn as a dot', () => {
    const tree = lay({ categories: cats, series: [{ name: 'x', values: [10, null, 30, null, 50] }] })
    expect(absoluteLeaves(tree).filter((l) => /^series\[0\]/.test(l.part ?? '') && l.k === 'rect').length).toBeGreaterThanOrEqual(3)
  })

  it('end labels name each line at its right end and replace the legend', () => {
    const tree = lay({ categories: cats, series: seriesOf(3, 5) })
    const parts = absoluteLeaves(tree).map((l) => l.part ?? '')
    expect(parts.filter((p) => /^label\[\d\]$/.test(p))).toHaveLength(3)
    expect(parts.some((p) => p.startsWith('legend'))).toBe(false)
    const plotRight = Math.max(...leavesOf(tree, 'grid[0]').map((l) => l.x + l.width))
    for (const l of leavesOf(tree, 'label')) expect(l.x).toBeGreaterThanOrEqual(plotRight)
  })

  it('end labels with identical end values are nudged apart and never overlap', () => {
    const same = [1, 2, 3].map((i) => ({ name: `Line ${i}`, values: [5, 6, 7, 8, 9] }))
    const tree = lay({ categories: cats, series: same })
    const ls = leavesOf(tree, 'label').sort((a, b) => a.y - b.y)
    expect(ls).toHaveLength(3)
    for (let i = 1; i < ls.length; i++) expect(ls[i].y).toBeGreaterThanOrEqual(ls[i - 1].y + ls[i - 1].height - 0.5)
    assertChartSane(tree, SZ)
  })

  it('endLabels: false shows a legend for several series and none for one', () => {
    const multi = lay({ categories: cats, series: seriesOf(2, 5), endLabels: false })
    expect(absoluteLeaves(multi).some((l) => (l.part ?? '').startsWith('legend'))).toBe(true)
    const one = lay({ categories: cats, series: seriesOf(1, 5), endLabels: false })
    expect(absoluteLeaves(one).some((l) => (l.part ?? '').startsWith('legend'))).toBe(false)
  })

  it('a single series uses the accent role; six series use six distinct hues', () => {
    const c = chartCtx(SZ)
    expect(coloursOf(lay({ categories: cats, series: seriesOf(1, 5) }), /^series\[0\]$/)[0]).toBe(c.resolveColor('accent').color)
    const six = lay({ categories: cats, series: seriesOf(6, 5), endLabels: false })
    const cols = [0, 1, 2, 3, 4, 5].map((s) => coloursOf(six, new RegExp(`^series\\[${s}\\]$`))[0])
    expect(new Set(cols).size).toBe(6)
    for (const col of cols) expect(col).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('a seventh series is cut, never a seventh hue', () => {
    const t = lay({ categories: cats, series: seriesOf(8, 5), endLabels: false })
    expect(leavesOf(t, 'series[6]')).toHaveLength(0)
  })

  it('markers: none / last / all', () => {
    const dots = (markers: string) => absoluteLeaves(lay({ categories: cats, series: seriesOf(1, 5), markers })).filter((l) => /\.dot\[/.test(l.part ?? '')).length
    expect(dots('none')).toBe(0)
    expect(dots('last')).toBe(1)
    expect(dots('all')).toBe(5)
  })

  it('highlightIndex keeps one series in colour and dims the others', () => {
    const base = lay({ categories: cats, series: seriesOf(3, 5), endLabels: false })
    const hl = lay({ categories: cats, series: seriesOf(3, 5), endLabels: false, highlightIndex: 1 })
    expect(coloursOf(hl, /^series\[1\]$/)[0]).toBe(coloursOf(base, /^series\[1\]$/)[0])
    expect(coloursOf(hl, /^series\[0\]$/)[0]).not.toBe(coloursOf(base, /^series\[0\]$/)[0])
  })

  it('baseline zero puts a 0 tick on the axis; auto may crop a high band', () => {
    const high = { categories: cats, series: [{ name: 'x', values: [90, 92, 95, 97, 99] }], endLabels: false }
    expect(textsOf(lay({ ...high, baseline: 'zero' }))).toContain('0')
    expect(textsOf(lay({ ...high, baseline: 'auto' }))).not.toContain('0')
  })

  it('long category labels wrap or thin out and never overlap', () => {
    const long = Array.from({ length: 12 }, (_, i) => `Quarterly figure number ${i + 1}`)
    const tree = lay({ categories: long, series: [{ name: 'x', values: long.map((_, i) => i + 1) }] }, { width: 600, height: 400 })
    assertChartSane(tree, { width: 600, height: 400 })
    const shown = absoluteLeaves(tree).filter((l) => /^cat\[\d+\]/.test(l.part ?? ''))
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThan(12)
  })

  it('a long series name cannot push the plot outside the box', () => {
    const tree = lay({ categories: cats, series: [{ name: 'An extremely long series name that goes on', values: [1, 2, 3, 4, 5] }] })
    assertChartSane(tree, SZ)
  })

  it('monotone curve uses cubic segments', () => {
    const d = (curve: string) => (leavesOf(lay({ curve, endLabels: false }), 'series[0]')[0].node as any).d as string
    expect(d('monotone')).toMatch(/C/)
    expect(d('linear')).not.toMatch(/C/)
  })

  it('negative values extend below a zero baseline', () => {
    const tree = lay({ categories: cats, series: [{ name: 'x', values: [-10, 5, -3, 8, 12] }], endLabels: false })
    assertChartSane(tree, SZ)
    expect(textsOf(tree).some((t) => t.startsWith('-') || t.startsWith('−'))).toBe(true)
  })

  it('capacity: more than 6 series fails with a truncate-series remedy', () => {
    const r = tlsDLine.capacity!({ categories: cats, series: seriesOf(7, 5) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
    expect(r.remedy).toEqual([{ kind: 'truncate', slot: 'series' }])
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDLine)
  })
})
