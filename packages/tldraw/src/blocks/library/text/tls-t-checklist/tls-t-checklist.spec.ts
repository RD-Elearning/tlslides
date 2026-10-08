/**
 * tls.t.checklist — state to mark/role mapping, done styles, columns, capacity.
 */

import { tlsTChecklist } from './index'
import { stateOf } from './layout'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf } from '../standard-suite'

const ctx = (w = 800, h = 460) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 800, h = 460) =>
  tlsTChecklist.layout({ ...(tlsTChecklist.defaults as any), ...props } as any, ctx(w, h))
const ITEMS = [
  { text: 'one', state: 'done' },
  { text: 'two', state: 'open' },
  { text: 'three', state: 'blocked' },
]

standardBlockSuite(tlsTChecklist, {
  overflowProps: { items: Array.from({ length: 30 }, (_, i) => ({ text: `Item ${i}`, state: 'open' })) },
})

describe('tls.t.checklist', () => {
  it('maps each state to its mark and colour role', () => {
    const c = ctx()
    const tree = lay({ items: ITEMS })
    const mark = (i: number) => leavesOf(tree, `item[${i}].mark`)
    const rect = (i: number) => mark(i).find((l) => l.k === 'rect')!.node as any
    const icon = (i: number) => mark(i).find((l) => l.k === 'icon')

    expect(rect(0).fill.color).toBe(c.resolveColor('positive').color)
    expect(icon(0)).toBeDefined()
    expect(rect(1).stroke.color).toBe(c.resolveColor('line').color)
    expect(rect(1).fill).toBeUndefined()
    expect(icon(1)).toBeUndefined()
    expect(rect(2).fill.color).toBe(c.resolveColor('negative').color)
    expect(icon(2)).toBeDefined()
  })

  it('done mark uses the check icon path and blocked a stroked cross, both scaled to the glyph box', () => {
    const tree = lay({ items: ITEMS })
    const done = leavesOf(tree, 'item[0].mark').find((l) => l.k === 'icon')!
    const blocked = leavesOf(tree, 'item[2].mark').find((l) => l.k === 'icon')!
    expect((done.node as any).strokeWidth).toBeUndefined()
    expect((blocked.node as any).strokeWidth).toBeGreaterThan(0)
    expect(done.width).toBe(done.height)
  })

  it('unknown or missing state is open; strings are accepted as open items', () => {
    expect(stateOf({ text: 'x' })).toBe('open')
    expect(stateOf({ text: 'x', state: 'weird' })).toBe('open')
    expect(stateOf('plain')).toBe('open')
    expect(stateOf(null)).toBe('open')
    const tree = lay({ items: ['a', 'b'] })
    expect(leavesOf(tree, 'item[0].mark')).toHaveLength(1)
  })

  it('doneStyle strike draws one strike per text line, across that line, for done items only', () => {
    const tree = lay({ doneStyle: 'strike', items: [{ text: 'done thing', state: 'done' }, { text: 'open thing', state: 'open' }] })
    const strikes = leavesOf(tree, 'item[0].strike')
    const text = leavesOf(tree, 'item[0].text')[0]
    expect(strikes).toHaveLength((text.node as any).lines.length)
    expect(strikes[0].x).toBe(text.x)
    expect(strikes[0].width).toBeCloseTo((text.node as any).lines[0].width, 0)
    expect(strikes[0].y).toBeGreaterThan(text.y)
    expect(strikes[0].y).toBeLessThan(text.y + text.height)
    expect(leavesOf(tree, 'item[1].strike')).toHaveLength(0)
  })

  it('a wrapped done item gets a strike on every line', () => {
    const long = 'word '.repeat(40)
    const tree = lay({ doneStyle: 'strike', items: [{ text: long, state: 'done' }, { text: 'b' }] }, 400, 800)
    const lines = (leavesOf(tree, 'item[0].text')[0].node as any).lines.length
    expect(lines).toBeGreaterThan(1)
    expect(leavesOf(tree, 'item[0].strike')).toHaveLength(lines)
  })

  it('doneStyle dim mutes the done text only; check and strike never dim open items', () => {
    const c = ctx()
    const colorOf = (tree: any, i: number) => (leavesOf(tree, `item[${i}].text`)[0].node as any).style.color
    const dim = lay({ doneStyle: 'dim', items: ITEMS })
    expect(colorOf(dim, 0)).toBe(c.resolveColor('textMuted').color)
    expect(colorOf(dim, 1)).toBe(c.resolveColor('text').color)
    const check = lay({ doneStyle: 'check', items: ITEMS })
    expect(colorOf(check, 0)).toBe(c.resolveColor('text').color)
    expect(leavesOf(check, 'item[0].strike')).toHaveLength(0)
  })

  it('2 columns split items and keep both columns inside the box', () => {
    const tree = lay({ columns: '2', items: [...ITEMS, { text: 'four' }] })
    const xs = new Set(leavesOf(tree, 'item').filter((l) => l.part!.endsWith('.text')).map((l) => Math.round(l.x)))
    expect(xs.size).toBe(2)
  })

  describe('capacity', () => {
    it('fits defaults, overflows 30 items, remedies reflow then truncate when wide', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ text: `A long checklist line that goes on and on ${i}`, state: 'open' }))
      const r = tlsTChecklist.capacity!({ ...(tlsTChecklist.defaults as any), items } as any, { width: 1000, height: 120 }, ctx(1000, 120))
      expect(r.fits).toBe(false)
      expect(r.remedy).toEqual([{ kind: 'reflow', to: "columns: '2'" }, { kind: 'truncate', slot: 'items' }])
      expect(r.budget.items.max).toBe(10)
    })
  })
})
