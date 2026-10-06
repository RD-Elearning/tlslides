/**
 * tls.d.area — overlap / stacked / percent maths, opacity, hues, empty data.
 */

import { tlsDArea } from './index'
import { absoluteLeaves, leavesOf, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, coloursOf, isNoData, layoutOf, seriesOf, textsOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 900, height: 520 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDArea, props, size)
const cats = ['A', 'B', 'C', 'D']
const ys = (tree: any, part: string) => [...((leavesOf(tree, part)[0].node as any).d as string).matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => Number(m[2]))

standardBlockSuite(tlsDArea, { overflowProps: { series: seriesOf(7, 4), categories: cats } })

describe('tls.d.area', () => {
  it('empty and all-zero data render "No data"', () => {
    expect(isNoData(lay({ series: [] }))).toBe(true)
    expect(isNoData(lay({ categories: cats, series: [{ name: 'x', values: [0, 0, 0, 0] }] }))).toBe(true)
  })

  it('stacked: the top of series 0 is the bottom of series 1 (shared edge)', () => {
    const tree = lay({ categories: cats, series: seriesOf(2, 4), mode: 'stacked', curve: 'linear' })
    const edge0 = ys(tree, 'area[0].edge')
    const d1 = (leavesOf(tree, 'area[1]')[0].node as any).d as string
    for (const y of edge0) expect(d1).toContain(String(Math.round(y * 100) / 100))
  })

  it('stacked axis reaches the sum of the series; overlap reaches only the largest', () => {
    const s = [{ name: 'a', values: [40, 40, 40, 40] }, { name: 'b', values: [40, 40, 40, 40] }]
    const stackedTicks = textsOf(lay({ categories: cats, series: s, mode: 'stacked' })).map(Number).filter((n) => !Number.isNaN(n))
    const overlapTicks = textsOf(lay({ categories: cats, series: s, mode: 'overlap' })).map(Number).filter((n) => !Number.isNaN(n))
    expect(Math.max(...stackedTicks)).toBeGreaterThanOrEqual(80)
    expect(Math.max(...overlapTicks)).toBeLessThan(80)
  })

  it('percent mode: the axis is 0-100% and the top layer ends at the 100% gridline', () => {
    const tree = lay({ categories: cats, series: seriesOf(3, 4), mode: 'percent', curve: 'linear' })
    expect(textsOf(tree)).toContain('100%')
    const topY = Math.min(...ys(tree, 'area[2].edge'))
    const grid100 = leavesOf(tree, 'grid[5]').length ? leavesOf(tree, 'grid[5]')[0] : leavesOf(tree, 'grid[4]')[0]
    expect(Math.abs(topY - (grid100.y + grid100.height / 2))).toBeLessThan(2)
  })

  it('soft overlap fills sit in a faded group; solid and stacked do not', () => {
    const faded = (tree: any) => JSON.stringify(tree).includes('"opacity"')
    expect(faded(lay({ categories: cats, series: seriesOf(2, 4), mode: 'overlap', opacity: 'soft' }))).toBe(true)
    expect(faded(lay({ categories: cats, series: seriesOf(2, 4), mode: 'overlap', opacity: 'solid' }))).toBe(false)
    expect(faded(lay({ categories: cats, series: seriesOf(2, 4), mode: 'stacked' }))).toBe(false)
  })

  it('a null value is treated as zero in the area', () => {
    const tree = lay({ categories: cats, series: [{ name: 'a', values: [10, null, 30, 20] }, { name: 'b', values: [5, 5, 5, 5] }], mode: 'stacked' })
    assertChartSane(tree, SZ)
  })

  it('negative values in stacked mode are ignored (clamped at zero), not subtracted', () => {
    const tree = lay({ categories: cats, series: [{ name: 'a', values: [10, -20, 30, 20] }, { name: 'b', values: [5, 5, 5, 5] }], mode: 'stacked' })
    assertChartSane(tree, SZ)
  })

  it('a legend names every series; a single series has none', () => {
    const legend = (tree: any) => absoluteLeaves(tree).filter((l) => (l.part ?? '').startsWith('legend/label')).length
    expect(legend(lay({ categories: cats, series: seriesOf(3, 4) }))).toBe(3)
    expect(legend(lay({ categories: cats, series: seriesOf(1, 4) }))).toBe(0)
  })

  it('single series uses accent; six series use six distinct hues', () => {
    const c = chartCtx(SZ)
    expect(coloursOf(lay({ categories: cats, series: seriesOf(1, 4) }), /^area\[0\]$/)[0]).toBe(c.resolveColor('accent').color)
    const six = lay({ categories: cats, series: seriesOf(6, 4), mode: 'stacked' })
    const cols = [0, 1, 2, 3, 4, 5].map((s) => coloursOf(six, new RegExp(`^area\\[${s}\\]$`))[0])
    expect(new Set(cols).size).toBe(6)
  })

  it('long category labels never overlap', () => {
    const long = Array.from({ length: 10 }, (_, i) => `Reporting period ${i + 1}`)
    const tree = lay({ categories: long, series: [{ name: 'a', values: long.map((_, i) => i + 1) }] }, { width: 600, height: 400 })
    assertChartSane(tree, { width: 600, height: 400 })
  })

  it('capacity: more than 24 categories fails', () => {
    const many = Array.from({ length: 25 }, (_, i) => `c${i}`)
    const r = tlsDArea.capacity!({ categories: many, series: seriesOf(1, 25) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDArea)
  })
})
