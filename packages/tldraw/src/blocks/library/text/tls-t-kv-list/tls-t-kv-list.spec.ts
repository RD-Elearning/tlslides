/**
 * tls.t.kv-list — column alignment, leaders, columns, capacity.
 */

import { tlsTKvList } from './index'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf } from '../standard-suite'

const ctx = (w = 800, h = 360) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 800, h = 360) =>
  tlsTKvList.layout({ ...(tlsTKvList.defaults as any), ...props } as any, ctx(w, h))
const one = (tree: any, part: string) => leavesOf(tree, part).find((l) => l.part === part)!

standardBlockSuite(tlsTKvList, {
  overflowProps: { items: Array.from({ length: 30 }, (_, i) => ({ key: `Key ${i}`, value: `Value ${i}` })) },
})

describe('tls.t.kv-list', () => {
  it('every key starts at the same x and every value is right-aligned to the same edge (valueAlign end)', () => {
    const tree = lay({})
    const keys = [0, 1, 2, 3, 4].map((i) => one(tree, `key[${i}]`))
    expect(new Set(keys.map((k) => Math.round(k.x))).size).toBe(1)
    for (let i = 0; i < 5; i++) {
      const v = one(tree, `value[${i}]`)
      expect(Math.abs(v.x + v.width - 800)).toBeLessThanOrEqual(2)
    }
  })

  it('valueAlign start puts all values at one x', () => {
    const tree = lay({ valueAlign: 'start' })
    const xs = new Set([0, 1, 2, 3, 4].map((i) => Math.round(one(tree, `value[${i}]`).x)))
    expect(xs.size).toBe(1)
  })

  it('dots leader sits between key end and value start on each row', () => {
    const tree = lay({ leader: 'dots' })
    for (let i = 0; i < 5; i++) {
      const k = one(tree, `key[${i}]`)
      const v = one(tree, `value[${i}]`)
      const l = leavesOf(tree, `leader[${i}]`)[0]
      expect(l).toBeDefined()
      expect(l.x).toBeGreaterThanOrEqual(k.x + k.width - 1)
      expect(l.x + l.width).toBeLessThanOrEqual(v.x + 1)
      expect(l.k).toBe('text')
    }
  })

  it('no dot leader when the gap is too small to be worth drawing', () => {
    const tree = lay({ leader: 'dots', valueAlign: 'start', items: [{ key: 'k'.repeat(30), value: 'v' }, { key: 'a', value: 'b' }] }, 300, 360)
    expect(leavesOf(tree, 'leader').length).toBeLessThanOrEqual(2)
  })

  it('rule leader draws one hairline per row, none otherwise', () => {
    expect(leavesOf(lay({ leader: 'rule' }), 'rule')).toHaveLength(5)
    expect(leavesOf(lay({ leader: 'none' }), 'rule')).toHaveLength(0)
    expect(leavesOf(lay({ leader: 'none' }), 'leader')).toHaveLength(0)
  })

  it('keyTone picks the key colour role; values use text', () => {
    const c = ctx()
    const key = (tone: string) => (one(lay({ keyTone: tone }), 'key[0]').node as any).style.color
    expect(key('muted')).toBe(c.resolveColor('textMuted').color)
    expect(key('text')).toBe(c.resolveColor('text').color)
    expect((one(lay({}), 'value[0]').node as any).style.color).toBe(c.resolveColor('text').color)
  })

  it('long values wrap in the value column instead of overlapping the key', () => {
    const tree = lay({ items: [{ key: 'Note', value: 'word '.repeat(40) }, { key: 'b', value: 'c' }], valueAlign: 'start' }, 600, 800)
    const k = one(tree, 'key[0]')
    const v = one(tree, 'value[0]')
    expect(v.x).toBeGreaterThanOrEqual(k.x + k.width)
    expect(v.height).toBeGreaterThan(k.height)
    expect(one(tree, 'key[1]').y).toBeGreaterThanOrEqual(v.y + v.height - 1)
  })

  it('2 columns split the pairs and both groups start at the top', () => {
    const tree = lay({ columns: '2' }, 1000, 360)
    expect(one(tree, 'key[0]').y).toBe(one(tree, 'key[3]').y)
    expect(one(tree, 'key[3]').x).toBeGreaterThan(500)
  })

  it('capacity: reflow to two columns when wide, then truncate', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ key: `Key ${i}`, value: `Value ${i}` }))
    const r = tlsTKvList.capacity!({ ...(tlsTKvList.defaults as any), items } as any, { width: 1000, height: 100 }, ctx(1000, 100))
    expect(r.fits).toBe(false)
    expect(r.remedy).toEqual([{ kind: 'reflow', to: "columns: '2'" }, { kind: 'truncate', slot: 'items' }])
  })
})
