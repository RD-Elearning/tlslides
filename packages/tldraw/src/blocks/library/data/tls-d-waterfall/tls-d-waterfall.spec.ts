/**
 * tls.d.waterfall — running totals, floating bars, signs, connectors, negatives, labels.
 */

import { tlsDWaterfall } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 900, height: 480 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDWaterfall, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const fill = (t: any, part: string) => (exact(t, part).node as any).fill.color
const steps = [
  { label: 'Start', value: 100, kind: 'total' },
  { label: 'Up', value: 40 },
  { label: 'Down', value: -30 },
  { label: 'End', value: 110, kind: 'total' },
]

standardBlockSuite(tlsDWaterfall, { overflowProps: { steps: Array.from({ length: 13 }, (_, i) => ({ label: `S${i}`, value: i + 1 })) } })

describe('tls.d.waterfall', () => {
  it('empty and all-zero data render "No data"', () => {
    expect(isNoData(lay({ steps: [] }))).toBe(true)
    expect(isNoData(lay({ steps: [{ label: 'a', value: 0 }, { label: 'b', value: 0 }, { label: 'c', value: 0 }] }))).toBe(true)
  })

  it('a delta floats from the running total: bar 1 starts where bar 0 ends', () => {
    const t = lay({ steps })
    const a = exact(t, 'bar[0]')
    const b = exact(t, 'bar[1]')
    expect(Math.abs(b.y + b.height - a.y)).toBeLessThan(1.01)
    // 40 on a 100 base: the delta is 0.4 of the total's height.
    expect(b.height / a.height).toBeCloseTo(0.4, 1)
  })

  it('a decrease hangs from the running total and the next bar continues from its bottom', () => {
    const t = lay({ steps })
    const up = exact(t, 'bar[1]')
    const down = exact(t, 'bar[2]')
    expect(Math.abs(down.y - up.y)).toBeLessThan(1.01)
    expect(down.height).toBeCloseTo(up.height * (30 / 40), 0)
  })

  it('totals start at the zero baseline', () => {
    const t = lay({ steps })
    const a = exact(t, 'bar[0]')
    const z = exact(t, 'bar[3]')
    expect(Math.abs(a.y + a.height - (z.y + z.height))).toBeLessThan(0.5)
  })

  it('colours by sign: positive / negative / accent for totals; single uses accent for all', () => {
    const c = chartCtx(SZ)
    const t = lay({ steps })
    expect(fill(t, 'bar[0]')).toBe(c.resolveColor('accent').color)
    expect(fill(t, 'bar[1]')).toBe(c.resolveColor('positive').color)
    expect(fill(t, 'bar[2]')).toBe(c.resolveColor('negative').color)
    const s = lay({ steps, colorBy: 'single' })
    expect(new Set([0, 1, 2, 3].map((i) => fill(s, `bar[${i}]`))).size).toBe(1)
  })

  it('connectors link neighbouring bars and can be removed', () => {
    const t = lay({ steps })
    expect(absoluteLeaves(t).filter((l) => /^connector\[/.test(l.part ?? ''))).toHaveLength(3)
    expect(absoluteLeaves(lay({ steps, connectors: false })).filter((l) => /^connector\[/.test(l.part ?? ''))).toHaveLength(0)
    const c0 = exact(t, 'connector[0]')
    const b0 = exact(t, 'bar[0]')
    const b1 = exact(t, 'bar[1]')
    expect(c0.x).toBeGreaterThanOrEqual(b0.x + b0.width - 0.01)
    expect(c0.x + c0.width).toBeLessThanOrEqual(b1.x + 0.01)
  })

  it('value labels carry a sign for deltas and none for totals', () => {
    const t = textsOf(lay({ steps }))
    expect(t).toEqual(expect.arrayContaining(['100', '+40', '-30', '110']))
    expect(textsOf(lay({ steps, valueLabels: 'none' }))).not.toContain('+40')
  })

  it('a total with no number takes the running total', () => {
    const t = lay({ steps: [{ label: 'a', value: 50, kind: 'total' }, { label: 'b', value: 25 }, { label: 'c', value: null, kind: 'total' }] })
    expect(exact(t, 'bar[2]').height).toBeCloseTo(exact(t, 'bar[0]').height * 1.5, 0)
  })

  it('the running total may go negative', () => {
    const t = lay({ steps: [{ label: 'a', value: 20, kind: 'total' }, { label: 'b', value: -50 }, { label: 'c', value: 10 }] })
    assertChartSane(t, SZ)
  })

  it('long step labels wrap or thin out without overlap', () => {
    const long = Array.from({ length: 10 }, (_, i) => ({ label: `Operating cost bucket ${i + 1}`, value: i % 2 ? -5 : 8 }))
    const t = lay({ steps: [{ label: 'Start of the period', value: 50, kind: 'total' }, ...long] }, { width: 640, height: 420 })
    assertChartSane(t, { width: 640, height: 420 })
  })

  it('every step keeps its label (clipped, not thinned out)', () => {
    const t = lay({ steps: [{ label: 'Opening balance', value: 50, kind: 'total' }, { label: 'Expansion revenue', value: 10 }, { label: 'Contraction', value: -4 }, { label: 'Closing balance', value: 56, kind: 'total' }] }, { width: 480, height: 360 })
    for (let i = 0; i < 4; i++) expect(absoluteLeaves(t).some((l) => l.part === `cat[${i}]`)).toBe(true)
    assertChartSane(t, { width: 480, height: 360 })
  })

  it('capacity: more than 12 steps fails', () => {
    const r = tlsDWaterfall.capacity!({ steps: Array.from({ length: 13 }, (_, i) => ({ label: `${i}`, value: 1 })) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDWaterfall)
  })
})
