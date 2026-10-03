/**
 * tls.x.footer-text — separators, alignment, spread, rule toggle, ellipsis, capacity.
 */

import { tlsXFooterText } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../../text/standard-suite'

const ctx = (w = 1200, h = 40) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 1200, h = 40) =>
  tlsXFooterText.layout({ ...(tlsXFooterText.defaults as any), ...props } as any, ctx(w, h))
const text = (l: any) => l.node.lines.map((x: any) => x.text).join('')

standardBlockSuite(tlsXFooterText, {
  overflowProps: { items: ['a', 'b', 'c', 'd'] },
})

describe('tls.x.footer-text', () => {
  it('draws one separator between items: dot, bar, none', () => {
    const items = ['One', 'Two', 'Three']
    expect(leavesOf(lay({ items, separator: 'dot' }), 'sep').map(text)).toEqual(['·', '·'])
    expect(leavesOf(lay({ items, separator: 'bar' }), 'sep').map(text)).toEqual(['|', '|'])
    expect(leavesOf(lay({ items, separator: 'none' }), 'sep')).toHaveLength(0)
  })

  it('start anchors at x 0, end at the right edge, centre in the middle', () => {
    const run = (align: string) => {
      const ls = absoluteLeaves(lay({ align, showRule: false })).filter((l) => l.k === 'text')
      return { min: Math.min(...ls.map((l) => l.x)), max: Math.max(...ls.map((l) => l.x + l.width)) }
    }
    expect(run('start').min).toBe(0)
    expect(run('end').max).toBeGreaterThan(1190)
    expect(run('end').max).toBeLessThanOrEqual(1203)
    const c = run('center')
    expect((c.min + c.max) / 2).toBeCloseTo(600, -1)
  })

  it('spread pins the first item left, the last right, a middle one centred; no separators', () => {
    const tree = lay({ align: 'spread', items: ['Left', 'Mid', 'Right'] })
    const [a, b, c] = leavesOf(tree, 'item')
    expect(a.x).toBe(0)
    expect(c.x + c.width).toBeCloseTo(1200, -1)
    expect(b.x + b.width / 2).toBeCloseTo(600, -1)
    expect(leavesOf(tree, 'sep')).toHaveLength(0)
  })

  it('showRule adds a hairline rect above the text and pushes the text down', () => {
    const on = lay({ showRule: true })
    const off = lay({ showRule: false })
    const r = leavesOf(on, 'rule')[0]
    expect(r.k).toBe('rect')
    expect(r.width).toBe(1200)
    expect(r.height).toBeLessThanOrEqual(3)
    expect(leavesOf(on, 'item')[0].y).toBeGreaterThan(r.y + r.height)
    expect(leavesOf(off, 'rule')).toHaveLength(0)
    expect(leavesOf(off, 'item')[0].y).toBe(0)
  })

  it('uses the footnote size and muted colour; the line is quiet (height <= 80)', () => {
    const c = ctx()
    const l = leavesOf(lay({}), 'item')[0].node as any
    expect(l.style.size).toBe(c.resolveText('footnote').size)
    expect(l.style.color).toBe(c.resolveColor('textMuted').color)
    expect((lay({ showRule: true }) as any).box.height).toBeLessThanOrEqual(80)
  })

  it('an item wider than its share is ellipsised, never wrapped, and stays inside the box', () => {
    const tree = lay({ items: ['x'.repeat(40), 'y'.repeat(40), 'z'.repeat(40)], align: 'start' }, 400)
    for (const l of leavesOf(tree, 'item')) {
      expect((l.node as any).lines).toHaveLength(1)
      expect(l.x + l.width).toBeLessThanOrEqual(402)
    }
    expect(leavesOf(tree, 'item').some((l) => text(l).endsWith('…'))).toBe(true)
  })

  it('items keep their order and never overlap', () => {
    const ls = leavesOf(lay({ items: ['One', 'Two', 'Three'] }), 'item')
    for (let i = 1; i < ls.length; i++) expect(ls[i].x).toBeGreaterThanOrEqual(ls[i - 1].x + ls[i - 1].width)
  })

  it('empty or hostile items give an empty row, no crash', () => {
    expect(() => lay({ items: [] })).not.toThrow()
    expect(leavesOf(lay({ items: ['', '  ', null] }), 'item')).toHaveLength(0)
  })

  it('capacity: more than three items or a line wider than the box does not fit', () => {
    const c = ctx(300, 40)
    expect(tlsXFooterText.capacity!({ items: ['a', 'b'] } as any, { width: 300, height: 40 }, c).fits).toBe(true)
    const r = tlsXFooterText.capacity!({ items: ['x'.repeat(40), 'y'.repeat(40)] } as any, { width: 300, height: 40 }, c)
    expect(r.fits).toBe(false)
  })
})
