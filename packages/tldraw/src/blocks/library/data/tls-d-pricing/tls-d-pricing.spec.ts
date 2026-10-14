/**
 * tls.d.pricing — equal-height cards, featured styles, toggles, check icon, capacity, flat tree.
 */

import { tlsDPricing } from './index'
import { BlockRegistry } from '../../../registry'
import { registerBuiltInBlocks } from '../../index'
import { makeCtx } from '../../layout/test-helpers'
import { absoluteLeaves, allNodes, assertContained, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, isNoData, textsOf } from '../_chart/chart-test'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 1280, height: 700 }
const reg = new BlockRegistry()
registerBuiltInBlocks(reg)
const ctxOf = (size = SZ) => makeCtx(size, reg)
const lay = (props: Record<string, unknown>, size = SZ) => tlsDPricing.layout({ ...(tlsDPricing.defaults as any), ...props } as any, ctxOf(size))
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const plan = (n: number, featured = false, features = ['a', 'b']) => ({ name: `P${n}`, price: `$${n}`, period: '/ mo', features, cta: 'Go', featured })

standardBlockSuite(tlsDPricing, { overflowProps: { plans: [plan(1), plan(2, true, Array.from({ length: 8 }, (_, i) => `a quite long feature line number ${i}`)), plan(3)], align: 'stretch' } })

describe('tls.d.pricing', () => {
  it('fewer than one plan renders "No data"', () => {
    expect(isNoData(lay({ plans: [] }))).toBe(true)
  })

  it('align: stretch gives every card the same height even with unequal feature lists', () => {
    const t = lay({ plans: [plan(1, false, ['a']), plan(2, false, ['a', 'b', 'c', 'd', 'e']), plan(3, false, ['a', 'b'])], featuredStyle: 'outline', align: 'stretch' })
    const hs = [0, 1, 2].map((i) => exact(t, `card[${i}]`).height)
    expect(hs[0]).toBeCloseTo(hs[1], 3)
    expect(hs[2]).toBeCloseTo(hs[1], 3)
    const ys = [0, 1, 2].map((i) => exact(t, `card[${i}]`).y)
    expect(new Set(ys).size).toBe(1)
  })

  it('align: top lets cards hug their content', () => {
    const t = lay({ plans: [plan(1, false, ['a']), plan(2, false, ['a', 'b', 'c', 'd', 'e'])], featuredStyle: 'outline', align: 'top' })
    expect(exact(t, 'card[0]').height).toBeLessThan(exact(t, 'card[1]').height)
  })

  it('cards tile the width with equal gaps and equal widths', () => {
    const t = lay({})
    const c = [0, 1, 2].map((i) => exact(t, `card[${i}]`))
    expect(c[0].width).toBeCloseTo(c[1].width, 3)
    expect(c[1].x - (c[0].x + c[0].width)).toBeCloseTo(c[2].x - (c[1].x + c[1].width), 3)
    expect(c[2].x + c[2].width).toBeLessThanOrEqual(SZ.width + 0.5)
  })

  it('raised: the featured card is taller and starts higher, bottoms line up, text rows align', () => {
    const t = lay({ featuredStyle: 'raised' })
    const f = exact(t, 'card[1]')
    const o = exact(t, 'card[0]')
    expect(f.y).toBeLessThan(o.y)
    expect(f.y + f.height).toBeCloseTo(o.y + o.height, 3)
    expect(exact(t, 'featured[1]')).toBeDefined()
    expect(exact(t, 'price[1]').y).toBeCloseTo(exact(t, 'price[0]').y, 3)
  })

  it('outline: accent outline on the featured card only; filled: accent surface', () => {
    const ctx = ctxOf()
    const o = lay({ featuredStyle: 'outline' })
    expect((exact(o, 'featured[1]').node as any).stroke.color).toBe(ctx.resolveColor('accent').color)
    expect(exact(o, 'featured[0]')).toBeUndefined()
    const f = lay({ featuredStyle: 'filled' })
    expect((exact(f, 'card[1]').node as any).fill.color).toBe(ctx.resolveColor('accent').color)
    expect((exact(f, 'card[0]').node as any).fill.color).not.toBe(ctx.resolveColor('accent').color)
  })

  it('every card surface is laid out through ctx.layoutChild as a tls.l.card', () => {
    const ctx = ctxOf()
    const calls: Array<{ type: string; box: any }> = []
    const spy = { ...ctx, layoutChild: (spec: any, box: any) => (calls.push({ type: spec.type, box }), ctx.layoutChild(spec, box)) }
    const t = tlsDPricing.layout(tlsDPricing.defaults as any, spy as any)
    expect(calls.map((c) => c.type)).toEqual(['tls.l.card', 'tls.l.card', 'tls.l.card'])
    expect(calls[1].box.x).toBeCloseTo(exact(t, 'card[1]').x, 3)
    expect(calls[1].box.height).toBeCloseTo(exact(t, 'card[1]').height, 3)
  })

  it('price and period share a line; features get a tick icon each; checkIcon changes it', () => {
    const t = lay({})
    const price = exact(t, 'price[1]')
    const period = exact(t, 'period[1]')
    expect(period.x).toBeGreaterThan(price.x)
    expect(period.y + period.height).toBeLessThanOrEqual(price.y + price.height + 1)
    expect(absoluteLeaves(t).filter((l) => /^feature\[1\]\.\d\.icon$/.test(l.part ?? '')).length).toBe(4)
    const a = (exact(t, 'feature[1].0.icon').node as any).icon
    const b = (exact(lay({ checkIcon: 'zap' }), 'feature[1].0.icon').node as any).icon
    expect(a).not.toBe(b)
  })

  it('showCta and showDescription remove their parts', () => {
    const off = lay({ showCta: false, showDescription: false })
    expect(absoluteLeaves(off).some((l) => /^(cta|description)\[/.test(l.part ?? ''))).toBe(false)
    expect(exact(lay({}), 'cta[1]')).toBeDefined()
    expect(exact(lay({}), 'description[1]')).toBeDefined()
  })

  it('the button sits at the bottom of every card', () => {
    const t = lay({ plans: [plan(1, false, ['a']), plan(2, false, ['a', 'b', 'c', 'd'])], featuredStyle: 'outline', align: 'stretch' })
    const bottom = (i: number) => exact(t, `cta[${i}]`).y + exact(t, `cta[${i}]`).height
    expect(bottom(0)).toBeCloseTo(bottom(1), 3)
    const card = exact(t, 'card[0]')
    expect(bottom(0)).toBeLessThan(card.y + card.height)
  })

  it('a long price shrinks to fit its card; a long feature wraps', () => {
    const size = { width: 700, height: 900 }
    const t = lay({ plans: [{ name: 'A', price: '$1,299,000', period: '/ year', features: ['An exceptionally long feature description that has to wrap'], cta: 'Go' }, plan(2)] }, size)
    // AC4: the base size depends on the type tier (roomy in a tall box), so the shrink is the scale
    const price = exact(t, 'price[0]')
    expect((price.node as any).style.scale).toBeLessThan(1)
    expect(price.x + price.width).toBeLessThanOrEqual(exact(t, 'card[0]').x + exact(t, 'card[0]').width)
    expect((exact(t, 'feature[0].0').node as any).lines.length).toBeGreaterThan(1)
    assertChartSane(t, size)
  })

  it('four plans fit and the tree is flat', () => {
    const t = lay({ plans: [plan(1), plan(2, true), plan(3), plan(4)] })
    assertContained(t, SZ)
    for (const n of allNodes(t)) if (n.k === 'group') expect([n.box.x, n.box.y]).toEqual([0, 0])
    expect(textsOf(t)).toEqual(expect.arrayContaining(['P1', 'P4']))
  })

  it('capacity: 5 plans, 9 features or a short box fail', () => {
    const c = ctxOf()
    const cap = (props: Record<string, unknown>, size = SZ) => tlsDPricing.capacity!({ ...(tlsDPricing.defaults as any), ...props } as any, size, c)
    expect(cap({}).fits).toBe(true)
    expect(cap({ plans: [1, 2, 3, 4, 5].map((n) => plan(n)) }).fits).toBe(false)
    expect(cap({ plans: [plan(1), plan(2, false, Array.from({ length: 9 }, (_, i) => `f${i}`))] }).fits).toBe(false)
    expect(cap({}, { width: 1280, height: 300 }).fits).toBe(false)
  })
})

describe('RV06 — example fits its box (review G06)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDPricing)
  })
})

describe('AC4 lead review — roomy tier', () => {
  const ex = () => tlsDPricing.describe!.example.props as any
  const painted = (t: any) => {
    const ls = absoluteLeaves(t)
    return Math.max(...ls.map((l) => l.y + l.height)) - Math.min(...ls.map((l) => l.y))
  }
  it('a tall box takes bigger type and the cards fill most of it; a short box keeps the compact tier', () => {
    const tall = lay(ex(), { width: 1728, height: 758 })
    const short = lay(ex(), { width: 1728, height: 520 })
    const size = (t: any) => (exact(t, 'price[0]').node as any).style.size
    expect(size(tall)).toBeGreaterThan(size(short))
    expect(painted(tall) / 758).toBeGreaterThanOrEqual(0.8)
    assertContained(short, { width: 1728, height: 520 })
  })
  it('fixed point: laid out again at its own painted height it picks the same tier and height', () => {
    const a = lay(ex(), { width: 1728, height: 758 })
    const h = Math.ceil(painted(a))
    const b = lay(ex(), { width: 1728, height: h })
    expect((exact(b, 'price[0]').node as any).style.size).toBe((exact(a, 'price[0]').node as any).style.size)
    expect(Math.abs(painted(b) - painted(a))).toBeLessThanOrEqual(1)
  })
  it('stretch: every card starts its rule (feature list) at the same height', () => {
    const t = lay({ plans: [{ name: 'A', price: 'Free', features: ['x'], cta: 'Go' }, { name: 'B', price: '$9', description: 'For teams of any size', features: ['y'], cta: 'Go' }] }, { width: 1728, height: 758 })
    expect(exact(t, 'rule[0]').y).toBeCloseTo(exact(t, 'rule[1]').y, 3)
  })
})
