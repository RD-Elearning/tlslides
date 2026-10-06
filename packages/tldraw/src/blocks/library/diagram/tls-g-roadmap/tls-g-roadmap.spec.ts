/**
 * tls.g.roadmap — bar geometry, sub-rows for overlaps, labels outside narrow bars, status colours.
 */

import { tlsGRoadmap } from './index'
import { assertExampleFits } from '../../data/_chart/chart-test'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within, type Rect, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1400, height: 520 }
const MIN = { width: 700, height: 300 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGRoadmap, props, size)
const periods = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`)
const bar = (t: any, l: number, i: number) => rectsOf(t, new RegExp(`^bar\\[${l}\\]\\[${i}\\]$`))[0]
const label = (t: any, l: number, i: number) => rectsOf(t, new RegExp(`^bar\\[${l}\\]\\[${i}\\]\\.label$`))[0]
const fill = (t: any, part: string) => (absoluteLeaves(t).find((l) => l.part === part)!.node as any).fill.color

standardBlockSuite(tlsGRoadmap, {
  overflowProps: { periods: periods(13) },
})

function allBars(t: any): Rect[] {
  return rectsOf(t, /^bar\[\d+\]\[\d+\]$/)
}
function outsideLabels(t: any): Rect[] {
  return rectsOf(t, /^bar\[\d+\]\[\d+\]\.label$/).filter((l) => {
    const m = /bar\[(\d+)\]\[(\d+)\]/.exec(l.part)!
    const b = bar(t, Number(m[1]), Number(m[2]))
    return !within(l, b)
  })
}

describe('tls.g.roadmap', () => {
  it('a bar spans start..end+1 columns, fractions included', () => {
    const t = lay({ periods: periods(4), lanes: [{ name: 'A', items: [{ label: 'x', start: 0, end: 1 }, { label: 'y', start: 2.5, end: 2.5 }] }], laneLabels: 'none' })
    const col = SZ.width / 4
    // bars are inset by 1px on each side so touching periods stay distinct
    expect(bar(t, 0, 0).x).toBeCloseTo(1, 1)
    expect(bar(t, 0, 0).width).toBeCloseTo(2 * col - 2, 1)
    expect(bar(t, 0, 1).x).toBeCloseTo(2.5 * col + 1, 1)
    expect(bar(t, 0, 1).width).toBeCloseTo(col - 2, 1)
  })

  it('overlapping bars of one lane get their own sub-rows and the lane grows; apart bars share a row', () => {
    const two = (b: any) => lay({ periods: periods(6), lanes: [{ name: 'A', items: [{ label: 'a', start: 0, end: 3 }, b] }, { name: 'B', items: [{ label: 'z', start: 0, end: 1 }] }] })
    const over = two({ label: 'b', start: 2, end: 4 })
    const apart = two({ label: 'b', start: 4, end: 5 })
    expect(bar(over, 0, 1).y).toBeGreaterThan(bar(over, 0, 0).y + bar(over, 0, 0).height - 1)
    expect(bar(apart, 0, 1).y).toBeCloseTo(bar(apart, 0, 0).y, 1)
    const lane = (t: any, i: number) => rectsOf(t, new RegExp(`^lane\\[${i}\\]$`))[0]
    const laneB = (t: any) => bar(t, 1, 0)
    expect(laneB(over).y).toBeGreaterThan(laneB(apart).y - 0.5)
  })

  it('a label wider than its bar goes outside on the right; at the right edge it flips to the left', () => {
    const t = lay({ periods: periods(6), laneLabels: 'none', lanes: [{ name: 'A', items: [{ label: 'A very long label here', start: 0, end: 0 }, { label: 'Edge label long text', start: 5, end: 5 }] }] })
    const b0 = bar(t, 0, 0)
    const l0 = label(t, 0, 0)
    expect(l0.x).toBeGreaterThanOrEqual(b0.x + b0.width)
    const b1 = bar(t, 0, 1)
    const l1 = label(t, 0, 1)
    expect(l1.x + l1.width).toBeLessThanOrEqual(b1.x + 1)
    const wide = lay({ periods: periods(4), laneLabels: 'none', lanes: [{ name: 'A', items: [{ label: 'Short', start: 0, end: 3 }] }] })
    expect(within(label(wide, 0, 0), bar(wide, 0, 0))).toBe(true)
  })

  it('no bar overlaps another bar or an outside label, at the maximum counts, preferred and min size', () => {
    const lanes = Array.from({ length: 6 }, (_, l) => ({
      name: `Lane ${l + 1} name here`,
      items: Array.from({ length: 5 }, (_, i) => ({ label: `Item ${i} ` + 'x'.repeat(20), start: i * 2.4 + (l % 2) * 0.3, end: i * 2.4 + 1.2, status: ['done', 'active', 'planned', 'risk'][i % 4] })),
    }))
    for (const size of [SZ, MIN]) {
      const t = lay({ periods: periods(12), lanes }, size)
      assertNoOverlap([...allBars(t), ...outsideLabels(t)])
      expect(JSON.stringify(t)).not.toMatch(/NaN|Infinity/)
    }
    const short = lanes.map((l) => ({ ...l, items: l.items.map((i) => ({ ...i, label: 'ab' })) }))
    assertChartSane(lay({ periods: periods(12), lanes: short }), SZ)
  })

  it('min counts (2 periods, 1 lane, 1 item) lay out cleanly', () => {
    assertChartSane(lay({ periods: periods(2), lanes: [{ name: 'Only', items: [{ label: 'Solo', start: 0, end: 1 }] }] }), SZ)
    assertChartSane(lay({ periods: periods(2), lanes: [{ name: 'Only', items: [{ label: 'Solo', start: 0, end: 1 }] }] }, MIN), MIN)
  })

  it('status colours: done/active/planned/risk differ; statusColors off gives one colour per lane', () => {
    const items = ['done', 'active', 'planned', 'risk'].map((status, i) => ({ label: 'x', start: i, end: i, status }))
    const t = lay({ periods: periods(4), lanes: [{ name: 'A', items }, { name: 'B', items: [{ label: 'y', start: 0, end: 0, status: 'done' }] }] })
    expect(new Set([0, 1, 2, 3].map((i) => fill(t, `bar[0][${i}]`))).size).toBe(4)
    const off = lay({ periods: periods(4), statusColors: false, lanes: [{ name: 'A', items }, { name: 'B', items: [{ label: 'y', start: 0, end: 0, status: 'done' }] }] })
    expect(new Set([0, 1, 2, 3].map((i) => fill(off, `bar[0][${i}]`))).size).toBe(1)
    expect(fill(off, 'bar[0][0]')).not.toBe(fill(off, 'bar[1][0]'))
    expect(absoluteLeaves(off).some((l) => (l.part ?? '').startsWith('legend'))).toBe(false)
  })

  it('today marker sits at the fractional period; -1 and out of range draw none', () => {
    const t = lay({ periods: periods(4), todayAt: 1.5, laneLabels: 'none' })
    expect(rectsOf(t, /^today$/)[0].x + 1).toBeCloseTo(1.5 * (SZ.width / 4), 0)
    expect(rectsOf(lay({ todayAt: -1 }), /^today/)).toHaveLength(0)
    expect(rectsOf(lay({ todayAt: 99 }), /^today/)).toHaveLength(0)
  })

  it('hostile items (swapped, out of range, missing numbers) are clamped inside the grid', () => {
    const t = lay({ periods: periods(3), laneLabels: 'none', lanes: [{ name: 'A', items: [{ label: 'a', start: 9, end: -2 }, { label: 'b' }, { label: 'c', start: 'x', end: null }] }] })
    assertChartSane(t, SZ)
    for (const b of allBars(t)) expect(b.x + b.width).toBeLessThanOrEqual(SZ.width + 1)
  })

  it('capacity: 13 periods, 7 lanes, 6 items fail; a crowded stack that cannot fit the height fails', () => {
    const ctx = chartCtx(SZ)
    const base = { periods: periods(4), lanes: [{ name: 'A', items: [{ label: 'a', start: 0, end: 1 }] }] } as any
    expect(tlsGRoadmap.capacity!(base, SZ, ctx).fits).toBe(true)
    expect(tlsGRoadmap.capacity!({ ...base, lanes: Array.from({ length: 7 }, () => base.lanes[0]) }, SZ, ctx).fits).toBe(false)
    expect(tlsGRoadmap.capacity!({ ...base, lanes: [{ name: 'A', items: Array.from({ length: 6 }, (_, i) => ({ label: 'a', start: 0, end: 3 })) }] }, SZ, ctx).fits).toBe(false)
    const stacked = Array.from({ length: 6 }, () => ({ name: 'L', items: Array.from({ length: 5 }, () => ({ label: 'a', start: 0, end: 3 })) }))
    expect(tlsGRoadmap.capacity!({ ...base, lanes: stacked }, SZ, ctx).fits).toBe(false)
  })
})

// RV07/08: the block's own example fits size.preferred and size.min (every line as wide as its glyphs).
describe('tls.g.roadmap example', () => {
  it('fits size.preferred and size.min', () => assertExampleFits(tlsGRoadmap))
  it('motion parts exist in the layout and use presets that animate', () => assertMotionTargetsExist(tlsGRoadmap, { staticParts: /^(lane|grid|today)/ }))
})
