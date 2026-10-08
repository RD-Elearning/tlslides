import { tlsCJourney } from './index'
import { showcaseSuite, tplCtx } from '../showcase-test'
import { geometry, milestonesOf } from './schema'

const seven = Array.from({ length: 7 }, (_, i) => ({ when: `${2020 + i}`, title: `Bước ${i + 1}` }))

showcaseSuite(tlsCJourney, {
  textProp: 'unused',
  escapeProps: (h) => ({ milestones: [{ when: '1', title: h }, { when: '2', title: 'b' }, { when: '3', title: 'c' }] }),
  overflowProps: { milestones: seven },
})

describe('tls.c.journey — specifics', () => {
  it('nodes alternate above and below the middle, left to right, inside the box', () => {
    const g = geometry(1728, 752, 5)
    expect(g.nodes.map((n) => n.above)).toEqual([true, false, true, false, true])
    for (let i = 1; i < g.nodes.length; i++) expect(g.nodes[i].x).toBeGreaterThan(g.nodes[i - 1].x)
    for (const n of g.nodes) {
      expect(n.y - g.r).toBeGreaterThan(0)
      expect(n.y + g.r).toBeLessThan(752)
    }
    expect(g.length).toBeGreaterThan(1728)
    expect(g.length).toBeLessThan(1728 * 1.2)
  })

  it('caps the list at 6 and the template renders one node and label per milestone', () => {
    expect(milestonesOf({ milestones: seven })).toHaveLength(6)
    const html = tlsCJourney.html!.template(tlsCJourney.defaults as any, tplCtx(1728, 752))
    expect(html.match(/data-part="node\[/g)).toHaveLength(5)
    expect(html.match(/data-part="label\[/g)).toHaveLength(5)
    expect(html).toContain('data-part="path"')
  })

  it('RV07: at size.min the example nodes (and their halo) stay inside the box and in order', () => {
    const [w, h] = tlsCJourney.size.min
    const n = (tlsCJourney.describe!.example.props as any).milestones.length
    const g = geometry(w, h, n)
    for (const p of g.nodes) {
      expect(p.x - g.r).toBeGreaterThanOrEqual(0)
      expect(p.x + g.r).toBeLessThanOrEqual(w)
      expect(p.y - g.r).toBeGreaterThan(0)
      expect(p.y + g.r).toBeLessThan(h)
    }
  })
})
