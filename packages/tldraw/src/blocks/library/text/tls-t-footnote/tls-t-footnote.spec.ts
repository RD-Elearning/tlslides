/**
 * tls.t.footnote — markers, alignment, muted footnote-size text, capacity.
 */

import { tlsTFootnote } from './index'
import { makeCtx as rv02Ctx } from '../test-helpers'
import { withMarker } from './layout'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../standard-suite'

const ctx = (w = 1100, h = 110) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 1100, h = 110) =>
  tlsTFootnote.layout({ ...(tlsTFootnote.defaults as any), ...props } as any, ctx(w, h))
const textOf = (tree: any, part: string) => (leavesOf(tree, part)[0].node as any).lines.map((l: any) => l.text).join('')

standardBlockSuite(tlsTFootnote, {
  overflowProps: { items: ['x '.repeat(150), 'y '.repeat(150), 'z', 'w'] },
})

describe('tls.t.footnote', () => {
  it('markers: none, number, asterisk, source (first line only)', () => {
    const items = ['a', 'b', 'c']
    expect(items.map((t, i) => withMarker('none', i, t))).toEqual(['a', 'b', 'c'])
    expect(items.map((t, i) => withMarker('number', i, t))).toEqual(['1. a', '2. b', '3. c'])
    expect(items.map((t, i) => withMarker('asterisk', i, t))).toEqual(['* a', '** b', '*** c'])
    expect(items.map((t, i) => withMarker('source', i, t))).toEqual(['Source: a', 'b', 'c'])
  })

  it('renders the marker into the text node', () => {
    const tree = lay({ items: ['Eurostat'], marker: 'source' })
    expect(textOf(tree, 'item[0]')).toBe('Source: Eurostat')
  })

  it('uses the footnote token size and the muted colour role', () => {
    const c = ctx()
    const node = leavesOf(lay({}), 'item[0]')[0].node as any
    expect(node.style.size).toBe(c.resolveText('footnote').size)
    expect(node.style.color).toBe(c.resolveColor('textMuted').color)
  })

  it('align end right-aligns every line to the box edge', () => {
    const tree = lay({ align: 'end', items: ['short', 'a much longer footnote line here'] })
    for (const l of absoluteLeaves(tree)) {
      expect(Math.abs(l.x + l.width - 1100)).toBeLessThanOrEqual(2)
    }
  })

  it('align start keeps one node per item at x 0', () => {
    const tree = lay({ align: 'start' })
    expect(leavesOf(tree, 'item')).toHaveLength(2)
    for (const l of leavesOf(tree, 'item')) expect(l.x).toBe(0)
  })

  it('items stack without overlap', () => {
    const tree = lay({ items: ['one', 'two', 'three', 'four'] })
    const ls = leavesOf(tree, 'item')
    for (let i = 1; i < ls.length; i++) expect(ls[i].y).toBeGreaterThanOrEqual(ls[i - 1].y + ls[i - 1].height - 1)
  })

  describe('capacity', () => {
    it('budget is 4 lines; wrapped lines count', () => {
      const r = tlsTFootnote.capacity!({ items: ['w '.repeat(300)] } as any, { width: 400, height: 500 }, ctx(400, 500))
      expect(r.fits).toBe(false)
      expect(r.budget.lines.max).toBe(4)
      expect(r.budget.lines.used).toBeGreaterThan(4)
      expect(r.remedy).toEqual([{ kind: 'truncate', slot: 'items' }])
    })
  })
})

describe('RV02 — honest size (review G02)', () => {
  const DEF = tlsTFootnote
  const leaves = (n: any, ox = 0, oy = 0, out: any[] = []): any[] => {
    const x = ox + n.box.x
    const y = oy + n.box.y
    if (n.k !== 'group') out.push({ x, y, w: n.box.width, h: n.box.height })
    for (const c of n.children ?? []) leaves(c, x, y, out)
    return out
  }

  it.each([
    ['preferred', DEF.size.preferred],
    ['min', DEF.size.min],
  ])('the example fits size.%s with nothing escaping it', (_label, [w, h]) => {
    const node = DEF.layout(DEF.describe!.example.props as any, rv02Ctx({ width: w, height: h }))
    expect(node.box.height).toBeLessThanOrEqual(h + 0.5)
    for (const l of leaves(node)) {
      expect(l.x + l.w).toBeLessThanOrEqual(w + 0.5)
      expect(l.y + l.h).toBeLessThanOrEqual(h + 0.5)
    }
  })

  it('the example exercises more than one line (one source line was a speck on the card)', () => {
    expect(((DEF.describe!.example.props as any).items as string[]).length).toBeGreaterThanOrEqual(2)
  })
})
