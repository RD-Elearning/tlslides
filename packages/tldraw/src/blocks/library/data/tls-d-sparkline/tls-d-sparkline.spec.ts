/**
 * tls.d.sparkline — line, fill, end dot, last figure, gaps, flat series, no-data.
 */

import { tlsDSparkline } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, isNoData } from '../_chart/chart-test'

const SZ = { width: 420, height: 90 }
const lay = (props: Record<string, unknown>, size = SZ) => tlsDSparkline.layout({ ...(tlsDSparkline.defaults as any), ...props } as any, makeCtx(size, makeRegistry()))
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const text = (t: any, part: string) => (exact(t, part)?.node as any)?.lines.map((l: any) => l.text).join('')

standardBlockSuite(tlsDSparkline, { overflowProps: { values: Array.from({ length: 61 }, (_, i) => i) } })

describe('tls.d.sparkline', () => {
  it('fewer than two numbers render "No data"', () => {
    expect(isNoData(lay({ values: [] }))).toBe(true)
    expect(isNoData(lay({ values: [5] }))).toBe(true)
    expect(isNoData(lay({ values: [NaN, null, 'x'] }))).toBe(true)
  })

  it('an axis-free line: no text other than label and last figure', () => {
    const t = lay({})
    const texts = absoluteLeaves(t).filter((l) => l.k === 'text').map((l) => l.part)
    expect(texts.sort()).toEqual(['label', 'last'])
  })

  it('the end dot sits on the last point and can be turned off', () => {
    const t = lay({ values: [1, 2, 3, 10], label: '', showLast: 'none' })
    const dot = exact(t, 'dot')
    const d = (exact(t, 'line').node as any).d as string
    const pts = [...d.matchAll(/([\d.-]+) ([\d.-]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
    const lastPt = pts[pts.length - 1]
    expect(Math.abs(dot.x + dot.width / 2 - lastPt.x)).toBeLessThan(0.5)
    expect(Math.abs(dot.y + dot.height / 2 - lastPt.y)).toBeLessThan(0.5)
    expect(exact(lay({ endDot: false }), 'dot')).toBeUndefined()
  })

  it('higher values are drawn higher (smaller y)', () => {
    const t = lay({ values: [1, 5, 9], label: '', showLast: 'none' })
    const ys = [...((exact(t, 'line').node as any).d as string).matchAll(/([\d.-]+) ([\d.-]+)/g)].map((m) => Number(m[2]))
    expect(ys[0]).toBeGreaterThan(ys[1])
    expect(ys[1]).toBeGreaterThan(ys[2])
  })

  it('fill adds a tinted area under the line; off by default values', () => {
    expect(exact(lay({ fill: true }), 'fill')).toBeDefined()
    expect(exact(lay({ fill: false }), 'fill')).toBeUndefined()
  })

  it('showLast: value prints the last number; delta prints last minus first with a sign', () => {
    expect(text(lay({ values: [10, 20, 35], showLast: 'value' }), 'last')).toBe('35')
    expect(text(lay({ values: [10, 20, 35], showLast: 'delta' }), 'last')).toBe('+25')
    expect(text(lay({ values: [35, 20, 10], showLast: 'delta' }), 'last')).toBe('-25')
    expect(exact(lay({ showLast: 'none' }), 'last')).toBeUndefined()
  })

  it('delta takes the positive role for a rise and the negative role for a fall', () => {
    const colour = (values: number[]) => (exact(lay({ values, showLast: 'delta' }), 'last').node as any).style.color
    expect(colour([1, 5])).not.toBe(colour([5, 1]))
  })

  it('a gap in the values splits the line, never drops to zero', () => {
    const t = lay({ values: [1, 2, null, 4, 5, 6], label: '', showLast: 'none' })
    expect(exact(t, 'line')).toBeDefined()
    expect(exact(t, 'line.seg[1]')).toBeDefined()
  })

  it('a flat series draws a horizontal mid-height line', () => {
    const t = lay({ values: [5, 5, 5, 5], label: '', showLast: 'none' })
    const ys = [...((exact(t, 'line').node as any).d as string).matchAll(/([\d.-]+) ([\d.-]+)/g)].map((m) => Number(m[2]))
    expect(new Set(ys).size).toBe(1)
    expect(ys[0]).toBeCloseTo(45, 0)
  })

  it('the line stays between the label and the last figure, and fits a long label', () => {
    const t = lay({ label: 'A very long sparkline label that goes on and on' })
    assertChartSane(t, SZ)
    const label = exact(t, 'label')
    const last = exact(t, 'last')
    expect(label.x + label.width).toBeLessThanOrEqual(last.x)
  })
})
