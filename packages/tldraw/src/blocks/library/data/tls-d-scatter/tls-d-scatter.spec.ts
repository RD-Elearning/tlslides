/**
 * tls.d.scatter — mapping, groups, trend line, quadrants, labels, highlight, empty data.
 */

import { tlsDScatter } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'

const SZ = { width: 820, height: 500 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDScatter, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const centre = (l: any) => ({ x: l.x + l.width / 2, y: l.y + l.height / 2 })
const pts = [
  { x: 0, y: 0, label: 'Origin' },
  { x: 10, y: 10, label: 'Top' },
  { x: 5, y: 5, label: 'Mid' },
]

standardBlockSuite(tlsDScatter, { overflowProps: { points: Array.from({ length: 61 }, (_, i) => ({ x: i, y: i * 2 })) } })

describe('tls.d.scatter', () => {
  it('empty and non-numeric data render "No data"', () => {
    expect(isNoData(lay({ points: [] }))).toBe(true)
    expect(isNoData(lay({ points: [{ x: 'a', y: null }, { x: NaN, y: 2 }] }))).toBe(true)
  })

  it('points map monotonically: larger x is further right, larger y is higher', () => {
    const t = lay({ points: pts, trendline: false })
    const a = centre(exact(t, 'point[0]'))
    const b = centre(exact(t, 'point[1]'))
    const m = centre(exact(t, 'point[2]'))
    expect(b.x).toBeGreaterThan(m.x)
    expect(m.x).toBeGreaterThan(a.x)
    expect(b.y).toBeLessThan(m.y)
    expect(m.y).toBeLessThan(a.y)
    expect((m.x - a.x) / (b.x - a.x)).toBeCloseTo(0.5, 2)
  })

  it('groups use distinct categorical colours and a legend; no groups use accent and no legend', () => {
    const c = chartCtx(SZ)
    const g = lay({ points: [{ x: 1, y: 1, group: 'A' }, { x: 2, y: 2, group: 'B' }, { x: 3, y: 3, group: 'C' }] })
    const fills = [0, 1, 2].map((i) => (exact(g, `point[${i}]`).node as any).fill.color)
    expect(new Set(fills).size).toBe(3)
    expect(absoluteLeaves(g).filter((l) => (l.part ?? '').startsWith('legend/label'))).toHaveLength(3)
    const plain = lay({ points: pts })
    expect((exact(plain, 'point[0]').node as any).fill.color).toBe(c.resolveColor('accent').color)
    expect(absoluteLeaves(plain).some((l) => (l.part ?? '').startsWith('legend'))).toBe(false)
  })

  it('six groups use six distinct hues', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ x: i, y: i * 2, group: `G${i}` }))
    const t = lay({ points: six })
    expect(new Set(six.map((_, i) => (exact(t, `point[${i}]`).node as any).fill.color)).size).toBe(6)
  })

  it('trend line fits y = x for perfectly linear data (45 degrees in data space)', () => {
    const t = lay({ points: pts, trendline: true })
    const d = ((exact(t, 'trend').node as any).d as string).match(/M([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)/)!
    const a = centre(exact(t, 'point[0]'))
    const b = centre(exact(t, 'point[1]'))
    expect(Number(d[1])).toBeCloseTo(a.x, 0)
    expect(Number(d[2])).toBeCloseTo(a.y, 0)
    expect(Number(d[3])).toBeCloseTo(b.x, 0)
    expect(Number(d[4])).toBeCloseTo(b.y, 0)
    expect(exact(lay({ points: pts, trendline: false }), 'trend')).toBeUndefined()
  })

  it('a vertical stack of points (all x equal) draws no trend line and no NaN', () => {
    const t = lay({ points: [{ x: 3, y: 1 }, { x: 3, y: 5 }, { x: 3, y: 9 }], trendline: true })
    expect(exact(t, 'trend')).toBeUndefined()
    assertChartSane(t, SZ)
  })

  it('quadrants add one vertical and one horizontal rule across the plot', () => {
    const t = lay({ points: pts, quadrants: true })
    const qx = exact(t, 'quadrant.x')
    const qy = exact(t, 'quadrant.y')
    expect(qx.height).toBeGreaterThan(qx.width)
    expect(qy.width).toBeGreaterThan(qy.height)
    expect(exact(lay({ points: pts, quadrants: false }), 'quadrant.x')).toBeUndefined()
  })

  it('labelPoints: none / highlighted / all', () => {
    const labels = (props: Record<string, unknown>) => absoluteLeaves(lay({ points: pts, trendline: false, ...props })).filter((l) => /^label\[/.test(l.part ?? '')).length
    expect(labels({ labelPoints: 'none' })).toBe(0)
    expect(labels({ labelPoints: 'highlighted', highlightIndex: 1 })).toBe(1)
    expect(labels({ labelPoints: 'all' })).toBe(3)
  })

  it('colliding labels are skipped, never stacked on top of each other', () => {
    const dense = Array.from({ length: 20 }, (_, i) => ({ x: 5 + (i % 3) * 0.01, y: 5 + (i % 2) * 0.01, label: `Point number ${i}` }))
    const t = lay({ points: [...dense, { x: 0, y: 0 }, { x: 10, y: 10 }], labelPoints: 'all' })
    assertChartSane(t, SZ)
  })

  it('highlightIndex colours that point accent and dims the others', () => {
    const c = chartCtx(SZ)
    const t = lay({ points: pts, highlightIndex: 2 })
    expect((exact(t, 'point[2]').node as any).fill.color).toBe(c.resolveColor('accent').color)
    expect((exact(t, 'point[0]').node as any).fill.color).not.toBe(c.resolveColor('accent').color)
  })

  it('axis labels exist on both axes and use the number format', () => {
    const t = lay({ points: [{ x: 1000, y: 20000 }, { x: 5000, y: 90000 }, { x: 3000, y: 50000 }], format: 'compact' })
    expect(textsOf(t).some((s) => /K$/.test(s))).toBe(true)
    expect(absoluteLeaves(t).some((l) => /^xtick\[/.test(l.part ?? ''))).toBe(true)
    expect(absoluteLeaves(t).some((l) => /^ytick\[/.test(l.part ?? ''))).toBe(true)
  })

  it('sixty points stay inside the box', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ x: i, y: (i * 37) % 53, group: `G${i % 4}` }))
    assertChartSane(lay({ points: many, trendline: true }), SZ)
  })

  it('capacity: more than 60 points fails', () => {
    const r = tlsDScatter.capacity!({ points: Array.from({ length: 61 }, (_, i) => ({ x: i, y: i })) } as any, SZ, chartCtx(SZ))
    expect(r.fits).toBe(false)
  })
})
