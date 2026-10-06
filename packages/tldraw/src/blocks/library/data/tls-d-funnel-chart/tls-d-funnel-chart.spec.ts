/**
 * tls.d.funnel-chart — widths, drop-off maths, shapes, labels, hues, empty data.
 */

import { tlsDFunnelChart } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 760, height: 440 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDFunnelChart, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const stages = [
  { label: 'A', value: 1000 },
  { label: 'B', value: 500 },
  { label: 'C', value: 100 },
]

standardBlockSuite(tlsDFunnelChart, { overflowProps: { stages: Array.from({ length: 8 }, (_, i) => ({ label: `S${i}`, value: 100 - i })) } })

describe('tls.d.funnel-chart', () => {
  it('empty, all-zero and negative data render "No data"', () => {
    expect(isNoData(lay({ stages: [] }))).toBe(true)
    expect(isNoData(lay({ stages: [{ label: 'a', value: 0 }, { label: 'b', value: 0 }, { label: 'c', value: 0 }] }))).toBe(true)
    expect(isNoData(lay({ stages: [{ label: 'a', value: -3 }, { label: 'b', value: NaN }, { label: 'c', value: -1 }] }))).toBe(true)
  })

  it('bars: each width is proportional to its value, left-aligned on one baseline', () => {
    const t = lay({ stages, shape: 'bars' })
    const w = (i: number) => exact(t, `stage[${i}]`).width
    expect(w(1) / w(0)).toBeCloseTo(0.5, 2)
    expect(w(2) / w(0)).toBeCloseTo(0.1, 2)
    expect(new Set([0, 1, 2].map((i) => Math.round(exact(t, `stage[${i}]`).x))).size).toBe(1)
  })

  it('funnel: stages are centred trapezoids whose bottom edge meets the next top edge', () => {
    const t = lay({ stages, shape: 'funnel' })
    const pts = (i: number) => [...((exact(t, `stage[${i}]`).node as any).d as string).matchAll(/([\d.-]+) ([\d.-]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
    const p0 = pts(0)
    const p1 = pts(1)
    // bottom width of stage 0 == top width of stage 1
    expect(p0[2].x - p0[3].x).toBeCloseTo(p1[1].x - p1[0].x, 1)
    // centred on one axis
    expect((p0[0].x + p0[1].x) / 2).toBeCloseTo((p1[0].x + p1[1].x) / 2, 1)
  })

  it('drop-off is the percentage change since the previous stage; the first stage has none', () => {
    const t = lay({ stages })
    expect(textsOf(t)).toEqual(expect.arrayContaining(['-50%', '-80%']))
    expect(exact(t, 'dropoff[0]')).toBeUndefined()
    expect(exact(lay({ stages, showDropoff: 'none' }), 'dropoff[1]')).toBeUndefined()
  })

  it('a zero previous stage does not divide by zero', () => {
    const t = lay({ stages: [{ label: 'a', value: 10 }, { label: 'b', value: 0 }, { label: 'c', value: 5 }] })
    expect(JSON.stringify(t)).not.toMatch(/Infinity|NaN/)
    expect(exact(t, 'dropoff[2]')).toBeUndefined()
  })

  it('stage names sit left of the shapes and values are shown (inside or outside)', () => {
    const t = lay({ stages, shape: 'bars' })
    const label = exact(t, 'stage[0].label')
    const shape = exact(t, 'stage[0]')
    expect(label.x + label.width).toBeLessThanOrEqual(shape.x + 1)
    expect(exact(t, 'stage[0].value')).toBeDefined()
    expect(exact(t, 'stage[2].value')).toBeDefined()
  })

  it('a narrow stage puts its value outside the shape instead of overflowing it', () => {
    const t = lay({ stages: [{ label: 'A', value: 1000 }, { label: 'B', value: 500 }, { label: 'C', value: 20 }], shape: 'bars' })
    const narrow = exact(t, 'stage[2]')
    const v = exact(t, 'stage[2].value')
    expect(v.x).toBeGreaterThanOrEqual(narrow.x + narrow.width - 0.5)
  })

  it('colours are an accent ramp: dark to light, never black', () => {
    const t = lay({ stages })
    const fills = [0, 1, 2].map((i) => (exact(t, `stage[${i}]`).node as any).fill.color)
    expect(new Set(fills).size).toBe(3)
    for (const f of fills) expect(f).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('long names, seven stages and small boxes stay inside the box', () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ label: `A rather long stage name ${i + 1}`, value: 1000 - i * 120 }))
    assertChartSane(lay({ stages: seven }), SZ)
    assertChartSane(lay({ stages }, { width: 300, height: 200 }), { width: 300, height: 200 })
  })

  it('capacity: more than seven stages fails', () => {
    const r = tlsDFunnelChart.capacity!({ stages: Array.from({ length: 8 }, (_, i) => ({ label: `${i}`, value: 1 })) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDFunnelChart)
  })
})
