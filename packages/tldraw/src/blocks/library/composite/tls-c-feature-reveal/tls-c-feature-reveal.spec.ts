import { tlsCFeatureReveal } from './index'
import { showcaseSuite, tplCtx } from '../showcase-test'
import { geometry } from './schema'

const seven = Array.from({ length: 7 }, (_, i) => ({ icon: 'star', title: `Ý ${i}` }))

showcaseSuite(tlsCFeatureReveal, {
  textProp: 'unused',
  escapeProps: (h) => ({ items: [{ icon: 'star', title: h }, { title: 'b' }, { title: 'c' }] }),
  overflowProps: { items: seven },
})

describe('tls.c.feature-reveal — specifics', () => {
  it('grid: 3 in a row, 4 as 2x2, 5 and 6 as 3 columns with the short row centred', () => {
    expect(new Set(geometry(1728, 752, 3).cards.map((c) => c.y)).size).toBe(1)
    const four = geometry(1728, 752, 4).cards
    expect(new Set(four.map((c) => c.x)).size).toBe(2)
    const five = geometry(1728, 752, 5).cards
    expect(five[3].x).toBeGreaterThan(five[0].x)
    for (const c of five) {
      expect(c.x + c.w).toBeLessThanOrEqual(1728 + 0.01)
      expect(c.y + c.h).toBeLessThanOrEqual(752 + 0.01)
    }
  })

  it('renders an inline outline icon per card and falls back for unknown names', () => {
    const html = tlsCFeatureReveal.html!.template({ items: [{ icon: 'rocket', title: 'a' }, { icon: 'nope', title: 'b' }, { title: 'c' }] } as any, tplCtx())
    expect(html.match(/<svg/g)).toHaveLength(3)
    expect(html).toContain('perspective:1600px')
  })
})

describe('RV03 — honest size, compact cards', () => {
  const { makeCtx } = require('../../layout/test-helpers')
  const { poster } = require('./poster')
  const ex = tlsCFeatureReveal.describe!.example.props as any
  const leaves = (n: any, out: any[] = []): any[] => {
    if (n.k !== 'group') out.push(n)
    for (const c of n.children ?? []) leaves(c, out)
    return out
  }
  it.each([
    ['preferred', tlsCFeatureReveal.size.preferred],
    ['min', tlsCFeatureReveal.size.min],
    ['half-width', [860, 500]],
  ])('the example (title + text) fits size.%s: every drawn leaf stays in its card', (_l, [w, h]) => {
    const node = poster(ex, makeCtx({ width: w, height: h }))
    const g = geometry(w, h, 3)
    expect(ex.items.every((m: any) => m.text)).toBe(true)
    for (const l of leaves(node).filter((x) => /^(title|text)\[/.test(x.part ?? ''))) {
      expect(l.box.x + l.box.width).toBeLessThanOrEqual(w + 0.5)
      const i = Number(/\[(\d+)\]/.exec(l.part)![1])
      const c = g.cards[i]
      expect(l.box.y + l.box.height).toBeLessThanOrEqual(c.y + c.h + 0.5)
    }
  })
  it('cards stop growing in a tall region and the grid is centred', () => {
    const g = geometry(1728, 900, 3)
    expect(g.cards[0].h).toBeLessThan(500)
    expect(g.cards[0].y).toBeGreaterThan(0)
  })
})
