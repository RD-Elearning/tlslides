/**
 * tls.d.bullet-chart — scale, target tick, bands, clamping, labels, capacity.
 */

import { tlsDBulletChart } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'

const SZ = { width: 820, height: 340 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDBulletChart, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]

standardBlockSuite(tlsDBulletChart, { overflowProps: { items: Array.from({ length: 6 }, (_, i) => ({ label: `K${i}`, value: 5, target: 6 })) } })

describe('tls.d.bullet-chart', () => {
  it('empty and unusable items render "No data"', () => {
    expect(isNoData(lay({ items: [] }))).toBe(true)
    expect(isNoData(lay({ items: [{ label: 'x', value: 'a', target: null }] }))).toBe(true)
  })

  it('value bar and target tick are proportional to the scale maximum', () => {
    const t = lay({ items: [{ label: 'a', value: 50, target: 75, max: 100 }] })
    const band = [0, 1, 2].map((k) => exact(t, `row[0].band[${k}]`))
    const track = { x: band[0].x, width: band[0].width + band[1].width + band[2].width }
    expect(exact(t, 'row[0].bar').width).toBeCloseTo(track.width * 0.5, 0)
    const tick = exact(t, 'row[0].target')
    expect(tick.x + tick.width / 2).toBeCloseTo(track.x + track.width * 0.75, 0)
  })

  it('the three bands cover 60 / 20 / 20 % of the scale, side by side', () => {
    const t = lay({ items: [{ label: 'a', value: 10, target: 10, max: 100 }] })
    const b = [0, 1, 2].map((k) => exact(t, `row[0].band[${k}]`))
    const total = b[0].width + b[1].width + b[2].width
    expect(b[0].width / total).toBeCloseTo(0.6, 2)
    expect(b[1].width / total).toBeCloseTo(0.2, 2)
    expect(Math.abs(b[0].x + b[0].width - b[1].x)).toBeLessThan(0.01)
    expect(Math.abs(b[1].x + b[1].width - b[2].x)).toBeLessThan(0.01)
  })

  it('bands: none draws a single quiet track', () => {
    const t = lay({ items: [{ label: 'a', value: 10, target: 10, max: 100 }], bands: 'none' })
    expect(exact(t, 'row[0].band[0]')).toBeDefined()
    expect(exact(t, 'row[0].band[1]')).toBeUndefined()
  })

  it('the bar is thinner than the bands and the target tick is taller than the bar', () => {
    const t = lay({})
    expect(exact(t, 'row[0].bar').height).toBeLessThan(exact(t, 'row[0].band[0]').height)
    expect(exact(t, 'row[0].target').height).toBeGreaterThan(exact(t, 'row[0].bar').height)
  })

  it('a value or target past the scale is clamped to its end', () => {
    const t = lay({ items: [{ label: 'a', value: 500, target: 900, max: 100 }] })
    const b = [0, 1, 2].map((k) => exact(t, `row[0].band[${k}]`))
    const right = b[2].x + b[2].width
    expect(exact(t, 'row[0].bar').x + exact(t, 'row[0].bar').width).toBeLessThanOrEqual(right + 0.5)
    expect(exact(t, 'row[0].target').x + 2).toBeLessThanOrEqual(right + 0.5)
  })

  it('without a scale maximum it derives one that contains value and target', () => {
    const t = lay({ items: [{ label: 'a', value: 80, target: 120 }] })
    const b = [0, 1, 2].map((k) => exact(t, `row[0].band[${k}]`))
    const right = b[2].x + b[2].width
    expect(exact(t, 'row[0].target').x + 2).toBeLessThan(right)
    expect(exact(t, 'row[0].bar').width).toBeLessThan(exact(t, 'row[0].target').x)
  })

  it('the bar uses the accent role, the value text is formatted, and a zero value draws no bar', () => {
    const c = chartCtx(SZ)
    const t = lay({ items: [{ label: 'a', value: 2500, target: 3000, max: 4000 }, { label: 'b', value: 0, target: 5, max: 10 }], format: 'compact' })
    expect((exact(t, 'row[0].bar').node as any).fill.color).toBe(c.resolveColor('accent').color)
    expect(textsOf(t)).toContain('2.5K')
    expect(exact(t, 'row[1].bar')).toBeUndefined()
  })

  it('a missing target draws no tick; long labels stay inside the box', () => {
    const t = lay({ items: [{ label: 'An exceptionally long KPI label that goes on', value: 5, target: null, max: 10 }] })
    expect(exact(t, 'row[0].target')).toBeUndefined()
    assertChartSane(t, SZ)
    assertChartSane(lay({}, { width: 300, height: 140 }), { width: 300, height: 140 })
  })

  it('capacity: more than five KPIs fails', () => {
    const r = tlsDBulletChart.capacity!({ items: Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: 1, target: 2 })) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
  })
})
