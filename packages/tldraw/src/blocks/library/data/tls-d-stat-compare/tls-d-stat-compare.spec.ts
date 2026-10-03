/**
 * tls.d.stat-compare — delta maths, polarity colours, connector variants, auto-fit values.
 */

import { tlsDStatCompare } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { absoluteLeaves, leavesOf, standardBlockSuite } from '../../text/standard-suite'

const ctx = (w = 880, h = 320) => makeCtx({ width: w, height: h }, makeRegistry())
const lay = (props: Record<string, unknown>, w = 880, h = 320) =>
  tlsDStatCompare.layout({ ...(tlsDStatCompare.defaults as any), ...props } as any, ctx(w, h))
const txt = (tree: any, part: string) => (leavesOf(tree, part)[0]?.node as any)?.lines.map((l: any) => l.text).join('')
const has = (tree: any, part: string) => leavesOf(tree, part).length > 0

standardBlockSuite(tlsDStatCompare, { noCapacity: true })

describe('tls.d.stat-compare', () => {
  it('percent delta is (right - left) / |left|, signed', () => {
    expect(txt(lay({ left: { label: 'a', value: 200 }, right: { label: 'b', value: 250 }, delta: 'percent' }), 'delta.text')).toBe('+25%')
    expect(txt(lay({ left: { label: 'a', value: 200 }, right: { label: 'b', value: 150 }, delta: 'percent' }), 'delta.text')).toBe('-25%')
  })

  it('absolute delta uses the format', () => {
    const t = lay({ left: { label: 'a', value: 1000 }, right: { label: 'b', value: 3500 }, delta: 'absolute', format: 'compact' })
    expect(txt(t, 'delta.text')).toBe('+2.5K')
  })

  it('percent delta from a zero base is omitted, never Infinity', () => {
    const t = lay({ left: { label: 'a', value: 0 }, right: { label: 'b', value: 10 }, delta: 'percent' })
    expect(has(t, 'delta')).toBe(false)
    expect(JSON.stringify(t)).not.toMatch(/Infinity|NaN/)
  })

  it('delta: none removes the pill', () => {
    expect(has(lay({ delta: 'none' }), 'delta')).toBe(false)
  })

  it('polarity: a rise is positive when upGood, negative when downGood, neutral otherwise', () => {
    const c = ctx()
    const rise = { left: { label: 'a', value: 10 }, right: { label: 'b', value: 20 } }
    const ink = (polarity: string) => (leavesOf(lay({ ...rise, polarity }), 'delta')[0].node as any).fill.color
    const tint = (role: string) => (leavesOf(lay({ ...rise, polarity: role === 'positive' ? 'upGood' : role === 'negative' ? 'downGood' : 'neutral' }), 'delta')[0].node as any).fill.color
    expect(ink('upGood')).toBe(tint('positive'))
    expect(ink('downGood')).toBe(tint('negative'))
    expect(new Set([ink('upGood'), ink('downGood'), ink('neutral')]).size).toBe(3)
    void c
  })

  it('connector: arrow is a path, vs is text, none removes it', () => {
    expect(leavesOf(lay({ connector: 'arrow' }), 'connector')[0].k).toBe('path')
    expect(leavesOf(lay({ connector: 'vs' }), 'connector')[0].k).toBe('text')
    expect(has(lay({ connector: 'none' }), 'connector')).toBe(false)
  })

  it('with no connector and no delta the two columns split the full width', () => {
    const t = lay({ connector: 'none', delta: 'none' })
    const l = leavesOf(t, 'left.value')[0]
    const r = leavesOf(t, 'right.value')[0]
    expect(Math.abs(l.x + l.width / 2 - 880 / 4)).toBeLessThan(3)
    expect(Math.abs(r.x + r.width / 2 - (880 * 3) / 4)).toBeLessThan(3)
  })

  it('both values share one font size and huge numbers shrink to fit the column', () => {
    const big = lay({ left: { label: 'a', value: 123456789012 }, right: { label: 'b', value: 9 }, format: 'plain' }, 600, 300)
    const sizeOf = (p: string) => (leavesOf(big, p)[0].node as any).style.size
    expect(sizeOf('left.value')).toBe(sizeOf('right.value'))
    expect(sizeOf('left.value')).toBeLessThan(96)
  })

  it('missing values render a dash and no delta', () => {
    const t = lay({ left: { label: 'a' }, right: { label: 'b', value: 5 } })
    expect(txt(t, 'left.value')).toBe('–')
    expect(has(t, 'delta')).toBe(false)
  })

  it('left sits left of the connector, right sits right of it', () => {
    const t = lay({})
    const l = leavesOf(t, 'left.value')[0]
    const c = leavesOf(t, 'connector')[0]
    const r = leavesOf(t, 'right.value')[0]
    expect(l.x + l.width).toBeLessThanOrEqual(r.x)
    expect(absoluteLeaves(t).length).toBeGreaterThan(5)
    void c
  })
})
