/**
 * tls.d.slope — endpoints, highlight, label nudging, gaps, flat range, empty data.
 */

import { tlsDSlope } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'

const SZ = { width: 760, height: 460 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDSlope, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const centre = (l: any) => ({ x: l.x + l.width / 2, y: l.y + l.height / 2 })
const items = [
  { name: 'Up', start: 10, end: 50 },
  { name: 'Down', start: 50, end: 10 },
  { name: 'Same', start: 30, end: 30 },
]

standardBlockSuite(tlsDSlope, { overflowProps: { items: Array.from({ length: 11 }, (_, i) => ({ name: `I${i}`, start: i, end: i + 1 })) } })

describe('tls.d.slope', () => {
  it('empty and non-numeric items render "No data"', () => {
    expect(isNoData(lay({ items: [] }))).toBe(true)
    expect(isNoData(lay({ items: [{ name: 'a', start: 'x', end: null }] }))).toBe(true)
  })

  it('a riser ends higher than it starts, a faller lower, a flat item level', () => {
    const t = lay({ items })
    const s = (i: number, e: 'start' | 'end') => centre(exact(t, `line[${i}].${e}`))
    expect(s(0, 'end').y).toBeLessThan(s(0, 'start').y)
    expect(s(1, 'end').y).toBeGreaterThan(s(1, 'start').y)
    expect(s(2, 'end').y).toBeCloseTo(s(2, 'start').y, 3)
    expect(s(0, 'end').x).toBeGreaterThan(s(0, 'start').x)
  })

  it('all items share one scale: equal values land at equal heights', () => {
    const t = lay({ items })
    expect(centre(exact(t, 'line[0].start')).y).toBeCloseTo(centre(exact(t, 'line[1].end')).y, 3)
    expect(centre(exact(t, 'line[1].start')).y).toBeCloseTo(centre(exact(t, 'line[0].end')).y, 3)
  })

  it('labels carry the name and value on the right side of each rail', () => {
    const t = lay({ items })
    expect(textsOf(t)).toEqual(expect.arrayContaining(['Up  10', '50  Up', 'Down  50', '10  Down']))
    const left = exact(t, 'label[0].start')
    const right = exact(t, 'label[0].end')
    expect(left.x + left.width).toBeLessThanOrEqual(centre(exact(t, 'line[0].start')).x)
    expect(right.x).toBeGreaterThanOrEqual(centre(exact(t, 'line[0].end')).x)
  })

  it('header labels sit above their rails', () => {
    const t = lay({ items, startLabel: '2023', endLabel: '2025' })
    expect(textsOf(t)).toEqual(expect.arrayContaining(['2023', '2025']))
    expect(exact(t, 'head.start').y).toBeLessThan(centre(exact(t, 'line[0].start')).y)
  })

  it('highlight risers colours risers positive and dims the rest; fallers the reverse', () => {
    const c = chartCtx(SZ)
    const colour = (t: any, i: number) => (exact(t, `line[${i}]`).node as any).stroke.color
    const r = lay({ items, highlight: 'risers' })
    expect(colour(r, 0)).toBe(c.resolveColor('positive').color)
    expect(colour(r, 1)).not.toBe(c.resolveColor('negative').color)
    const f = lay({ items, highlight: 'fallers' })
    expect(colour(f, 1)).toBe(c.resolveColor('negative').color)
    expect(colour(f, 0)).not.toBe(colour(r, 0))
    const none = lay({ items, highlight: 'none' })
    expect(colour(none, 0)).toBe(c.resolveColor('accent').color)
    expect(colour(none, 1)).toBe(colour(none, 0))
  })

  it('labels of near-equal values are nudged apart, never overlapping', () => {
    const crowded = Array.from({ length: 8 }, (_, i) => ({ name: `Item ${i}`, start: 50 + i * 0.1, end: 50 - i * 0.1 }))
    assertChartSane(lay({ items: crowded }), SZ)
  })

  it('a flat range (all values equal) does not divide by zero', () => {
    const t = lay({ items: [{ name: 'a', start: 5, end: 5 }, { name: 'b', start: 5, end: 5 }] })
    assertChartSane(t, SZ)
  })

  it('long names are clipped within their side and the box', () => {
    const t = lay({ items: [{ name: 'An exceptionally long item name', start: 1, end: 2 }, { name: 'Short', start: 2, end: 1 }] })
    assertChartSane(t, SZ)
    assertChartSane(lay({ items }, { width: 300, height: 220 }), { width: 300, height: 220 })
  })

  it('capacity: more than ten items fails', () => {
    const r = tlsDSlope.capacity!({ items: Array.from({ length: 11 }, (_, i) => ({ name: `${i}`, start: 1, end: 2 })) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
  })
})
