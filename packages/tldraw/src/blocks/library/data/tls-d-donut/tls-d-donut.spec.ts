/**
 * Tests for tls.d.donut — the pie engine with a hole: slices, colours, total, centre, labels.
 */

import { tlsDDonut } from './index'
import { makeCtx, SIZES, assertValidNode } from '../../layout/test-helpers'
import { makeRegistry } from '../../text/test-helpers'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, assertExampleFits, chartCtx, isNoData, textsOf } from '../_chart/chart-test'
import type { LayoutNode } from '../../../types'

const SZ = { width: 760, height: 460 }
const lay = (props: Record<string, unknown> = {}, size = SZ): LayoutNode => tlsDDonut.layout({ ...(tlsDDonut.defaults as any), ...props } as any, makeCtx(size, makeRegistry()))
const leaves = (t: LayoutNode) => absoluteLeaves(t)
const slices = (t: LayoutNode) => leaves(t).filter((l) => /^slice\[\d+\]$/.test(l.part ?? ''))
const fillOf = (l: { node: LayoutNode }) => (l.node as any).fill?.color as string

standardBlockSuite(tlsDDonut, { noCapacity: true })

describe('tls.d.donut', () => {
  it.each(SIZES)('produces a valid tree at $label ($box.width×$box.height) with 4 slices', ({ box }) => {
    const node = tlsDDonut.layout(
      { slices: [{ value: 30, label: 'a', color: 'accent' }, { value: 25, label: 'b' }, { value: 25, label: 'c' }, { value: 20, label: 'd' }], total: 100 } as any,
      makeCtx(box, makeRegistry())
    )
    assertValidNode(node)
    expect(node.k).toBe('group')
    expect(slices(node)).toHaveLength(4)
  })

  it('empty slices render "No data"', () => {
    expect(isNoData(lay({ slices: [] }))).toBe(true)
  })

  it('the ring has a hole: every slice outline carries an inner arc', () => {
    for (const s of slices(lay())) expect(((s.node as any).d as string).match(/A /g)!.length).toBe(2)
  })

  it('slice colours: a role is used, an unknown role (the old accent1..accent4) falls back to the ramp, never black', () => {
    const c = chartCtx(SZ)
    const t = lay({ slices: [{ label: 'a', value: 1, color: 'positive' }, { label: 'b', value: 1, color: 'accent3' }, { label: 'c', value: 1 }] })
    const cols = slices(t).map(fillOf)
    expect(cols[0]).toBe(c.resolveColor('positive').color)
    for (const col of cols) expect(col).toMatch(/^#[0-9a-f]{6}$/i)
    expect(cols).not.toContain('#000000')
    expect(new Set(cols).size).toBe(3)
  })

  it('the author order is kept (no sorting) and percentages are each value over the total', () => {
    const t = lay({ slices: [{ label: 'Small', value: 10 }, { label: 'Big', value: 60 }, { label: 'Mid', value: 30 }] })
    expect(textsOf(t).join(' | ')).toMatch(/Small 10%.*Big 60%.*Mid 30%/)
    const parts = leaves(t).filter((l) => /^legend\/label-\d+$/.test(l.part ?? ''))
    expect(((parts[0].node as any).lines[0].text as string)).toContain('Small')
  })

  it('a total above the slices leaves the rest of the ring as a track', () => {
    const t = lay({ slices: [{ label: 'Done', value: 30 }, { label: 'Doing', value: 20 }], total: 100 })
    expect(leaves(t).some((l) => l.part === 'track')).toBe(true)
    expect(textsOf(t).join(' | ')).toMatch(/Done 30%.*Doing 20%/)
    expect(leaves(lay({ slices: [{ label: 'a', value: 30 }, { label: 'b', value: 70 }], total: 100 })).some((l) => l.part === 'track')).toBe(false)
  })

  it('the centre value and caption sit inside the hole, centred, and shrink to fit it', () => {
    const t = lay({ centerValue: '$4.2M', centerLabel: 'Revenue' })
    const v = leaves(t).find((l) => l.part === 'centre')!
    const cap = leaves(t).find((l) => l.part === 'centre.label')!
    expect(v).toBeDefined()
    expect(cap.y).toBeGreaterThanOrEqual(v.y + v.height - 2)
    const ring = slices(t)
    const hole = ring.map((s) => s.node as any)
    expect(hole.length).toBeGreaterThan(0)
    const small = lay({ centerValue: '$4,200,000,000', centerLabel: 'Revenue' }, { width: 320, height: 220 })
    assertChartSane(small, { width: 320, height: 220 })
    expect(leaves(lay()).some((l) => l.part === 'centre')).toBe(false)
  })

  it('outside labels put each name and percent next to its slice and stay inside a small box', () => {
    const outside = lay({ labels: 'outside' })
    expect(leaves(outside).filter((l) => /^label\[\d\]$/.test(l.part ?? ''))).toHaveLength(4)
    const tiny = lay({ labels: 'outside' }, { width: 320, height: 220 })
    assertChartSane(tiny, { width: 320, height: 220 })
  })

  it('more than six slices fold the tail into a neutral Other slice', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ label: `S${i}`, value: 10 - i }))
    expect(slices(lay({ slices: many }))).toHaveLength(6)
  })

  it('garbage input never throws and never leaks NaN', () => {
    const t = lay({ slices: [null, { value: 'x' }, { label: 5, value: -3 }, { label: 'ok', value: 4 }] as any, total: 'q' as any })
    expect(JSON.stringify(t)).not.toMatch(/NaN|Infinity/)
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDDonut)
  })
})
