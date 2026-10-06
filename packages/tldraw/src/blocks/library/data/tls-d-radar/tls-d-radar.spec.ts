/**
 * tls.d.radar — geometry, scale, clamping, rings, hues, labels, empty data.
 */

import { tlsDRadar } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, seriesOf, textsOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 680, height: 500 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDRadar, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const axes = ['A', 'B', 'C', 'D']
const centre = (l: any) => ({ x: l.x + l.width / 2, y: l.y + l.height / 2 })
const pointsOf = (t: any, part: string) => [...((exact(t, part).node as any).d as string).matchAll(/([\d.-]+) ([\d.-]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))

standardBlockSuite(tlsDRadar, { overflowProps: { series: seriesOf(4, 4), axes } })

describe('tls.d.radar', () => {
  it('fewer than three axes, empty and all-zero data render "No data"', () => {
    expect(isNoData(lay({ axes: ['a', 'b'], series: [{ name: 's', values: [1, 2] }] }))).toBe(true)
    expect(isNoData(lay({ axes, series: [] }))).toBe(true)
    expect(isNoData(lay({ axes, series: [{ name: 's', values: [0, 0, 0, 0] }] }))).toBe(true)
  })

  it('axis 0 points straight up; the others follow clockwise', () => {
    const t = lay({ axes, series: [{ name: 's', values: [5, 5, 5, 5] }], max: 5 })
    const spoke = (i: number) => pointsOf(t, `spoke[${i}]`)[1]
    const o = pointsOf(t, 'spoke[0]')[0]
    expect(Math.abs(spoke(0).x - o.x)).toBeLessThan(0.1)
    expect(spoke(0).y).toBeLessThan(o.y)
    expect(spoke(1).x).toBeGreaterThan(o.x)
    expect(spoke(2).y).toBeGreaterThan(o.y)
    expect(spoke(3).x).toBeLessThan(o.x)
  })

  it('a value at max reaches the outer ring; half of max reaches half way', () => {
    const t = lay({ axes, series: [{ name: 's', values: [10, 5, 0, 10] }], max: 10 })
    const o = pointsOf(t, 'spoke[0]')[0]
    const full = pointsOf(t, 'spoke[0]')[1]
    const d0 = centre(exact(t, 'series[0].dot[0]'))
    const d1 = centre(exact(t, 'series[0].dot[1]'))
    const R = Math.hypot(full.x - o.x, full.y - o.y)
    expect(Math.hypot(d0.x - o.x, d0.y - o.y)).toBeCloseTo(R, 0)
    expect(Math.hypot(d1.x - o.x, d1.y - o.y)).toBeCloseTo(R / 2, 0)
  })

  it('values above max are clamped to the outer ring, negatives and gaps to the centre', () => {
    const t = lay({ axes, series: [{ name: 's', values: [99, -4, null, 5] }], max: 10 })
    const o = pointsOf(t, 'spoke[0]')[0]
    const full = pointsOf(t, 'spoke[0]')[1]
    const R = Math.hypot(full.x - o.x, full.y - o.y)
    expect(Math.hypot(centre(exact(t, 'series[0].dot[0]')).x - o.x, centre(exact(t, 'series[0].dot[0]')).y - o.y)).toBeCloseTo(R, 0)
    expect(Math.hypot(centre(exact(t, 'series[0].dot[1]')).x - o.x, centre(exact(t, 'series[0].dot[1]')).y - o.y)).toBeLessThan(0.5)
    expect(Math.hypot(centre(exact(t, 'series[0].dot[2]')).x - o.x, centre(exact(t, 'series[0].dot[2]')).y - o.y)).toBeLessThan(0.5)
    assertChartSane(t, SZ)
  })

  it('rings option sets the number of grid rings (default 4) and ring values are labelled', () => {
    const count = (t: any) => absoluteLeaves(t).filter((l) => /^grid\[/.test(l.part ?? '')).length
    expect(count(lay({ axes, series: seriesOf(1, 4) }))).toBe(4)
    expect(count(lay({ axes, series: seriesOf(1, 4), rings: 6 }))).toBe(6)
    expect(textsOf(lay({ axes, series: [{ name: 's', values: [4, 8, 2, 6] }], max: 8, rings: 4 }))).toEqual(expect.arrayContaining(['2', '4', '6', '8']))
  })

  it('fill adds a faded area per series; fill false draws outlines only', () => {
    expect(JSON.stringify(lay({ axes, series: seriesOf(1, 4), fill: true }))).toContain('"opacity"')
    expect(JSON.stringify(lay({ axes, series: seriesOf(1, 4), fill: false }))).not.toContain('"opacity"')
  })

  it('a single series uses accent; three series use three distinct hues and a legend', () => {
    const c = chartCtx(SZ)
    expect((exact(lay({ axes, series: seriesOf(1, 4) }), 'series[0]').node as any).stroke.color).toBe(c.resolveColor('accent').color)
    const three = lay({ axes, series: seriesOf(3, 4) })
    expect(new Set([0, 1, 2].map((s) => (exact(three, `series[${s}]`).node as any).stroke.color)).size).toBe(3)
    expect(absoluteLeaves(three).filter((l) => (l.part ?? '').startsWith('legend/label'))).toHaveLength(3)
  })

  it('axis labels sit outside the grid on their side of the chart', () => {
    const t = lay({ axes, series: seriesOf(1, 4) })
    const o = pointsOf(t, 'spoke[0]')[0]
    expect(exact(t, 'axis[0]').y + exact(t, 'axis[0]').height).toBeLessThanOrEqual(pointsOf(t, 'spoke[0]')[1].y + 1)
    expect(exact(t, 'axis[1]').x).toBeGreaterThan(o.x)
    expect(exact(t, 'axis[3]').x + exact(t, 'axis[3]').width).toBeLessThan(o.x)
  })

  it('eight axes with long labels stay inside the box without overlapping', () => {
    const eight = Array.from({ length: 8 }, (_, i) => `Criterion number ${i + 1}`)
    assertChartSane(lay({ axes: eight, series: seriesOf(2, 8) }), SZ)
    assertChartSane(lay({ axes: eight, series: seriesOf(2, 8) }, { width: 360, height: 300 }), { width: 360, height: 300 })
  })

  it('capacity: more than 3 series or 8 axes fails', () => {
    const r = tlsDRadar.capacity!({ axes, series: seriesOf(4, 4) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDRadar)
  })
})
