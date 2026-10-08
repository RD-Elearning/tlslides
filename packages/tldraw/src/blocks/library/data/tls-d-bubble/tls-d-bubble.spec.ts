/**
 * tls.d.bubble — area scaling, ordering, labels, legend, empty data.
 */

import { tlsDBubble } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 820, height: 500 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDBubble, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const centre = (l: any) => ({ x: l.x + l.width / 2, y: l.y + l.height / 2 })
const pts = [
  { x: 1, y: 1, r: 100, label: 'Big' },
  { x: 5, y: 5, r: 25, label: 'Quarter' },
  { x: 9, y: 9, r: 4, label: 'Small' },
]

standardBlockSuite(tlsDBubble, { overflowProps: { points: Array.from({ length: 31 }, (_, i) => ({ x: i, y: i, r: i + 1 })) } })

describe('tls.d.bubble', () => {
  it('empty, non-numeric and all-zero sizes render "No data"', () => {
    expect(isNoData(lay({ points: [] }))).toBe(true)
    expect(isNoData(lay({ points: [{ x: 1, y: 1, r: 0 }, { x: 2, y: 2, r: 0 }, { x: 3, y: 3, r: 0 }] }))).toBe(true)
    expect(isNoData(lay({ points: [{ x: 'a', y: 1, r: 5 }] }))).toBe(true)
  })

  it('circle AREA is proportional to the value: a quarter of the value has half the diameter', () => {
    const t = lay({ points: pts })
    const big = exact(t, 'point[0]')
    const quarter = exact(t, 'point[1]')
    expect(quarter.width / big.width).toBeCloseTo(0.5, 1)
  })

  it('a tiny value keeps a visible minimum size', () => {
    const t = lay({ points: pts })
    expect(exact(t, 'point[2]').width).toBeGreaterThanOrEqual(9.9)
  })

  it('positions map monotonically on both axes', () => {
    const t = lay({ points: pts })
    const a = centre(exact(t, 'point[0]'))
    const b = centre(exact(t, 'point[1]'))
    const c = centre(exact(t, 'point[2]'))
    expect(b.x).toBeGreaterThan(a.x)
    expect(c.x).toBeGreaterThan(b.x)
    expect(b.y).toBeLessThan(a.y)
    expect(c.y).toBeLessThan(b.y)
  })

  it('bubbles are drawn largest first (smaller ones on top) inside a half-transparent group', () => {
    const t = lay({ points: pts })
    const order = absoluteLeaves(t).filter((l) => /^point\[/.test(l.part ?? '')).map((l) => l.part)
    expect(order).toEqual(['point[0]', 'point[1]', 'point[2]'])
    expect(JSON.stringify(t)).toContain('"opacity"')
  })

  it('uses the accent role for every bubble', () => {
    const c = chartCtx(SZ)
    expect((exact(lay({ points: pts }), 'point[1]').node as any).fill.color).toBe(c.resolveColor('accent').color)
  })

  it('labels: inside a big bubble, beside a small one, and never overlapping', () => {
    const t = lay({ points: pts })
    const big = exact(t, 'point[0]')
    const l0 = exact(t, 'label[0]')
    expect(l0.x).toBeGreaterThanOrEqual(big.x - 1)
    expect(l0.x + l0.width).toBeLessThanOrEqual(big.x + big.width + 1)
    const small = exact(t, 'point[2]')
    const l2 = exact(t, 'label[2]')
    expect(l2.x >= small.x + small.width - 0.5 || l2.x + l2.width <= small.x + 0.5).toBe(true)
    assertChartSane(t, SZ)
  })

  it('the size legend adds reference circles and values at the right, and can be turned off', () => {
    const on = lay({ points: pts, sizeLegend: true })
    expect(exact(on, 'sizelegend[0]')).toBeDefined()
    expect(exact(on, 'sizelegend[0]').x).toBeGreaterThan(SZ.width * 0.7)
    expect(exact(lay({ points: pts, sizeLegend: false }), 'sizelegend[0]')).toBeUndefined()
    assertChartSane(on, SZ)
  })

  it('a zero-size bubble is not drawn, and thirty bubbles stay inside the box', () => {
    const t = lay({ points: [{ x: 1, y: 1, r: 0 }, { x: 2, y: 2, r: 5 }, { x: 3, y: 3, r: 9 }] })
    expect(exact(t, 'point[0]')).toBeUndefined()
    const many = Array.from({ length: 30 }, (_, i) => ({ x: i, y: (i * 7) % 11, r: (i % 5) + 1, label: `P${i}` }))
    assertChartSane(lay({ points: many }), SZ)
    assertChartSane(lay({ points: many, sizeLegend: true }, { width: 360, height: 300 }), { width: 360, height: 300 })
  })

  it('capacity: more than 30 points fails', () => {
    const r = tlsDBubble.capacity!({ points: Array.from({ length: 31 }, (_, i) => ({ x: i, y: i, r: 1 })) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDBubble)
  })
})
