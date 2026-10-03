/**
 * tls.t.tags — wrapping, sizes, tones, colours, alignment, capacity.
 */

import { tlsTTags } from './index'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../standard-suite'

const ctx = (w = 900, h = 220) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 900, h = 220) =>
  tlsTTags.layout({ ...(tlsTTags.defaults as any), ...props } as any, ctx(w, h))
const rects = (tree: any) => absoluteLeaves(tree).filter((l) => l.k === 'rect' && /^tag\[\d+\]$/.test(l.part ?? ''))
const rowsOf = (tree: any) => new Set(rects(tree).map((r) => Math.round(r.y))).size

standardBlockSuite(tlsTTags, {
  overflowProps: { items: Array.from({ length: 12 }, (_, i) => `A fairly long tag label number ${i}`) },
})

describe('tls.t.tags', () => {
  it('wraps onto new rows when the width runs out, and no tag leaves the box', () => {
    const wide = lay({}, 1400, 220)
    const narrow = lay({}, 420, 600)
    expect(rowsOf(narrow)).toBeGreaterThan(rowsOf(wide))
    for (const r of rects(narrow)) expect(r.x + r.width).toBeLessThanOrEqual(420 + 1)
  })

  it('tags in a row do not overlap and share one height', () => {
    const rs = rects(lay({})).sort((a, b) => a.y - b.y || a.x - b.x)
    for (let i = 1; i < rs.length; i++) {
      if (Math.round(rs[i].y) === Math.round(rs[i - 1].y)) expect(rs[i].x).toBeGreaterThanOrEqual(rs[i - 1].x + rs[i - 1].width)
    }
    expect(new Set(rs.map((r) => Math.round(r.height))).size).toBe(1)
  })

  it('size sm < md < lg in tag height', () => {
    const h = (size: string) => rects(lay({ size }))[0].height
    expect(h('sm')).toBeLessThan(h('md'))
    expect(h('md')).toBeLessThan(h('lg'))
  })

  it('pill has a full radius, rect a small one', () => {
    const pill = rects(lay({ shape: 'pill' }))[0]
    expect((pill.node as any).radius).toBe(pill.height / 2)
    expect((rects(lay({ shape: 'rect' }))[0].node as any).radius).toBeLessThan(pill.height / 2)
  })

  it('tones: soft fills, outline strokes only, solid fills with the accent', () => {
    const c = ctx()
    const node = (tone: string) => rects(lay({ tone }))[0].node as any
    expect(node('soft').fill).toBeDefined()
    expect(node('soft').stroke).toBeUndefined()
    expect(node('outline').fill).toBeUndefined()
    expect(node('outline').stroke.color).toBe(c.resolveColor('accent').color)
    expect(node('solid').fill.color).toBe(c.resolveColor('accent').color)
  })

  it('colorBy cycle uses the categorical series colours in order and wraps', () => {
    const c = ctx()
    const cats = c.tokens.categorical
    const items = Array.from({ length: cats.length + 1 }, (_, i) => `t${i}`)
    const rs = rects(lay({ tone: 'solid', colorBy: 'cycle', items }, 2000, 400)).sort((a, b) => a.part!.localeCompare(b.part!, undefined, { numeric: true }))
    expect((rs[0].node as any).fill.color).toBe(cats[0])
    expect((rs[1].node as any).fill.color).toBe(cats[1])
    expect((rs[cats.length].node as any).fill.color).toBe(cats[0])
  })

  it('align center centres a single row', () => {
    const rs = rects(lay({ align: 'center', items: ['a', 'b'] }))
    const left = Math.min(...rs.map((r) => r.x))
    const right = Math.max(...rs.map((r) => r.x + r.width))
    expect(Math.abs(left - (900 - right))).toBeLessThanOrEqual(1)
    const start = rects(lay({ align: 'start', items: ['a', 'b'] }))
    expect(Math.min(...start.map((r) => r.x))).toBe(0)
  })

  it('every label sits inside its tag', () => {
    const tree = lay({})
    for (const r of rects(tree)) {
      const label = leavesOf(tree, `${r.part}.label`)[0]
      expect(label.x).toBeGreaterThanOrEqual(r.x)
      expect(label.x + label.width).toBeLessThanOrEqual(r.x + r.width + 1)
      expect(label.y).toBeGreaterThanOrEqual(r.y)
      expect(label.y + label.height).toBeLessThanOrEqual(r.y + r.height + 1)
    }
  })

  it('an over-long label is clamped to the box width and wraps inside its tag', () => {
    const tree = lay({ items: ['w'.repeat(200)] }, 300, 800)
    const r = rects(tree)[0]
    expect(r.width).toBeLessThanOrEqual(300)
    expect(r.height).toBeGreaterThan(60)
  })

  it('capacity: remedy size sm, then truncate; no size remedy when already sm', () => {
    const items = Array.from({ length: 12 }, () => 'A fairly long tag label')
    const big = tlsTTags.capacity!({ ...(tlsTTags.defaults as any), items } as any, { width: 600, height: 100 }, ctx(600, 100))
    expect(big.remedy).toEqual([{ kind: 'reflow', to: "size: 'sm'" }, { kind: 'truncate', slot: 'items' }])
    const sm = tlsTTags.capacity!({ ...(tlsTTags.defaults as any), items, size: 'sm' } as any, { width: 600, height: 40 }, ctx(600, 40))
    expect(sm.remedy).toEqual([{ kind: 'truncate', slot: 'items' }])
  })
})
