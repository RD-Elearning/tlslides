/**
 * tls.d.gauge — bands, pointer angle, clamping, ticks, no-band fallback.
 */

import { tlsDGauge } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { absoluteLeaves, leavesOf, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 560, height: 380 }
const ctx = () => makeCtx(SZ, makeRegistry())
const lay = (props: Record<string, unknown>, size = SZ) => tlsDGauge.layout({ ...(tlsDGauge.defaults as any), ...props } as any, makeCtx(size, makeRegistry()))
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const text = (t: any, part: string) => (exact(t, part)?.node as any)?.lines.map((l: any) => l.text).join('')
/** Tip of the needle triangle: the second point of its path. */
const tip = (t: any) => {
  const m = ((exact(t, 'needle').node as any).d as string).match(/M([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)/)!
  return { x: Number(m[3]), y: Number(m[4]) }
}
const hub = (t: any) => {
  const h = exact(t, 'needle.hub')
  return { x: h.x + h.width / 2, y: h.y + h.height / 2 }
}

standardBlockSuite(tlsDGauge, { overflowProps: { bands: Array.from({ length: 6 }, (_, i) => ({ to: (i + 1) * 10, tone: 'warning' })) } })

describe('tls.d.gauge', () => {
  it('draws one sector per band, coloured by the tone role, in ascending order', () => {
    const c = ctx()
    const t = lay({})
    const fill = (i: number) => (exact(t, `bands[${i}]`).node as any).fill.color
    expect(fill(0)).toBe(c.resolveColor('negative').color)
    expect(fill(1)).toBe(c.resolveColor('warning').color)
    expect(fill(2)).toBe(c.resolveColor('positive').color)
    const unsorted = lay({ bands: [{ to: 100, tone: 'positive' }, { to: 30, tone: 'negative' }] })
    expect((exact(unsorted, 'bands[0]').node as any).fill.color).toBe(c.resolveColor('negative').color)
  })

  it('a stretch of the scale no band covers stays a track', () => {
    const c = ctx()
    const t = lay({ bands: [{ to: 50, tone: 'negative' }] })
    expect((exact(t, 'bands[1]').node as any).fill.color).not.toBe(c.resolveColor('negative').color)
  })

  it('with no bands the dial is a track and an accent fill up to the value', () => {
    const c = ctx()
    const t = lay({ bands: [] })
    expect((exact(t, 'bands[1]').node as any).fill.color).toBe(c.resolveColor('accent').color)
  })

  it('the needle points left at min, up at the middle and right at max', () => {
    const h = (t: any) => hub(t)
    const atMin = lay({ value: 0 })
    expect(tip(atMin).x).toBeLessThan(h(atMin).x - 10)
    expect(Math.abs(tip(atMin).y - h(atMin).y)).toBeLessThan(2)
    const mid = lay({ value: 50 })
    expect(Math.abs(tip(mid).x - h(mid).x)).toBeLessThan(2)
    expect(tip(mid).y).toBeLessThan(h(mid).y - 10)
    const atMax = lay({ value: 100 })
    expect(tip(atMax).x).toBeGreaterThan(h(atMax).x + 10)
  })

  it('a value outside the scale is clamped for the pointer but printed truthfully', () => {
    const over = lay({ value: 250 })
    const atMax = lay({ value: 100 })
    expect(tip(over).x).toBeCloseTo(tip(atMax).x, 3)
    expect(text(over, 'value')).toBe('250')
    assertChartSane(over, SZ)
  })

  it('negative scales work: value -50 on -100..100 points straight up', () => {
    const t = lay({ value: 0, min: -100, max: 100 })
    expect(Math.abs(tip(t).x - hub(t).x)).toBeLessThan(2)
  })

  it('marker pointer is a dot on the band, with no hub', () => {
    const t = lay({ needle: 'marker' })
    expect(exact(t, 'needle').k).toBe('rect')
    expect(exact(t, 'needle.hub')).toBeUndefined()
  })

  it('ticks label the scale ends and every band boundary', () => {
    const t = lay({})
    const labels = absoluteLeaves(t).filter((l) => /^tick\[\d+\]\.label$/.test(l.part ?? '')).map((l) => (l.node as any).lines[0].text)
    expect(labels).toEqual(['0', '40', '70', '100'])
  })

  it('degenerate scales (min == max) and a missing value never produce NaN', () => {
    assertChartSane(lay({ min: 5, max: 5, value: 5 }), SZ)
    assertChartSane(lay({ value: undefined }), SZ)
  })

  it('the label is optional', () => {
    expect(exact(lay({ label: '' }), 'label')).toBeUndefined()
    expect(text(lay({ label: 'NPS' }), 'label')).toBe('NPS')
    expect(leavesOf(lay({ label: 'x' }), 'value').length).toBeGreaterThan(0)
  })

  it('small boxes stay inside', () => {
    assertChartSane(lay({}, { width: 240, height: 160 }), { width: 240, height: 160 })
  })
})

describe('RV04 — example fits its box (review G04)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDGauge)
  })

  it.each([[560, 380], [1600, 800], [320, 220]])('the value sits below the pointer hub at %ix%i', (w, h) => {
    const t = lay({}, { width: w, height: h })
    const hb = exact(t, 'needle.hub')
    expect(exact(t, 'value').y).toBeGreaterThanOrEqual(hb.y + hb.height - 0.5)
  })
})
