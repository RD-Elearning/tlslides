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
