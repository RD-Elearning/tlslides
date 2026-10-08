/**
 * tls.d.progress-bar — fill maths, status colours, label positions, capacity.
 */

import { tlsDProgressBar } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { absoluteLeaves, leavesOf, standardBlockSuite } from '../../text/standard-suite'
import { assertExampleFits } from '../_chart/chart-test'

const ctx = (w = 760, h = 300) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 760, h = 300) =>
  tlsDProgressBar.layout({ ...(tlsDProgressBar.defaults as any), ...props } as any, ctx(w, h))
const one = (tree: any, part: string) => leavesOf(tree, part)[0]
const texts = (tree: any) => absoluteLeaves(tree).filter((l) => l.k === 'text').map((l) => (l.node as any).lines.map((x: any) => x.text).join(' '))

standardBlockSuite(tlsDProgressBar, {
  overflowProps: { items: Array.from({ length: 6 }, (_, i) => ({ label: `Row ${i}`, value: 50 })), thickness: 'lg' },
})

describe('tls.d.progress-bar', () => {
  it('fill width is proportional to value / max, clamped to the track', () => {
    const tree = lay({ items: [{ label: 'a', value: 50 }, { label: 'b', value: 25, max: 50 }, { label: 'c', value: 300 }] })
    const track = one(tree, 'row[0].track')
    expect(one(tree, 'row[0].fill').width).toBeCloseTo(track.width * 0.5, 0)
    expect(one(tree, 'row[1].fill').width).toBeCloseTo(track.width * 0.5, 0)
    expect(one(tree, 'row[2].fill').width).toBeCloseTo(track.width, 0)
    expect(texts(tree)).toContain('300%')
  })

  it('0% draws no fill; negative and NaN values behave as 0', () => {
    const tree = lay({ items: [{ label: 'a', value: 0 }, { label: 'b', value: -5 }, { label: 'c', value: NaN }] })
    for (let i = 0; i < 3; i++) expect(leavesOf(tree, `row[${i}].fill`)).toHaveLength(0)
  })

  it('status tone maps thirds to negative / warning / positive roles', () => {
    const c = ctx()
    const tree = lay({ tone: 'status', items: [{ label: 'a', value: 10 }, { label: 'b', value: 50 }, { label: 'c', value: 90 }] })
    const fill = (i: number) => (one(tree, `row[${i}].fill`).node as any).fill.color
    expect(fill(0)).toBe(c.resolveColor('negative').color)
    expect(fill(1)).toBe(c.resolveColor('warning').color)
    expect(fill(2)).toBe(c.resolveColor('positive').color)
  })

  it('accent tone uses the accent role for every bar', () => {
    const c = ctx()
    const tree = lay({ tone: 'accent' })
    expect((one(tree, 'row[0].fill').node as any).fill.color).toBe(c.resolveColor('accent').color)
  })

  it('showValue: percent / value / none', () => {
    expect(texts(lay({ showValue: 'percent', items: [{ label: 'a', value: 40, max: 80 }] }))).toContain('50%')
    expect(texts(lay({ showValue: 'value', items: [{ label: 'a', value: 40, max: 80 }] }))).toContain('40')
    expect(leavesOf(lay({ showValue: 'none' }), 'row[0].value')).toHaveLength(0)
  })

  it('track: false removes the track', () => {
    expect(leavesOf(lay({ track: false }), 'row[0].track')).toHaveLength(0)
    expect(leavesOf(lay({ track: true }), 'row[0].track')).toHaveLength(1)
  })

  it('labelPos left is shorter than above, and the label sits left of the track', () => {
    const top = (tree: any) => Math.max(...absoluteLeaves(tree).map((l) => l.y + l.height))
    const above = lay({ labelPos: 'above' })
    const left = lay({ labelPos: 'left' })
    expect(top(left)).toBeLessThan(top(above))
    const lab = one(left, 'row[0].label')
    const tr = one(left, 'row[0].track')
    expect(lab.x + lab.width).toBeLessThanOrEqual(tr.x)
  })

  it('thickness sm < md < lg', () => {
    const h = (thickness: string) => one(lay({ thickness }), 'row[0].track').height
    expect(h('sm')).toBeLessThan(h('md'))
    expect(h('md')).toBeLessThan(h('lg'))
  })

  it('long labels stay on one line inside the box', () => {
    const tree = lay({ items: [{ label: 'x'.repeat(200), value: 30 }] }, 400, 200)
    for (const l of absoluteLeaves(tree)) expect(l.x + l.width).toBeLessThanOrEqual(401)
  })

  it('capacity: reflow to labelPos left first, then truncate', () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ label: `Row ${i}`, value: 50 }))
    const r = tlsDProgressBar.capacity!({ ...(tlsDProgressBar.defaults as any), items, thickness: 'lg' } as any, { width: 760, height: 200 }, ctx(760, 200))
    expect(r.fits).toBe(false)
    expect(r.remedy[0]).toEqual({ kind: 'reflow', to: "labelPos: 'left'" })
    expect(r.remedy[r.remedy.length - 1]).toEqual({ kind: 'truncate', slot: 'items' })
  })
})

describe('RV04 — example fits its box (review G04)', () => {
  it('the example fits size.preferred and size.min, and every label is as wide as its glyphs', () => {
    assertExampleFits(tlsDProgressBar)
  })

  it('a right-aligned percentage ends on the track edge, not past it', () => {
    const tree = lay({ items: [{ label: 'Hiring plan', value: 72 }, { label: 'Budget', value: 100 }] })
    const track = one(tree, 'row[0].track')
    for (const i of [0, 1]) {
      const v = one(tree, `row[${i}].value`)
      expect(v.x + v.width).toBeLessThanOrEqual(track.x + track.width + 1.5)
    }
  })
})
