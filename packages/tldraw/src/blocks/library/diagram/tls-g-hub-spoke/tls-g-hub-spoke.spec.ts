/**
 * tls.g.hub-spoke — placement for both layouts, links that stop at the node edges, limits.
 */

import { tlsGHubSpoke } from './index'
import { standardBlockSuite, absoluteLeaves } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within } from '../diagram-test'

const SZ = { width: 1100, height: 600 }
const MIN = { width: 600, height: 340 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGHubSpoke, props, size)
const spokes = (n: number, full = false) =>
  Array.from({ length: n }, (_, i) => ({ label: full ? `Spoke ${i} ` + 'x'.repeat(14) : `Spoke ${i + 1}`, text: full ? 'n'.repeat(70) : `Note ${i + 1}`, icon: i % 2 ? 'globe' : 'check' }))

standardBlockSuite(tlsGHubSpoke, { overflowProps: { spokes: spokes(9) } })

/** Endpoints of a link path `M x y L x y`. */
function ends(d: string) {
  const n = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
  return { a: { x: n[0], y: n[1] }, b: { x: n[2], y: n[3] } }
}

describe('tls.g.hub-spoke', () => {
  it.each([
    ['circle', 'line'],
    ['circle', 'arrow-out'],
    ['half', 'arrow-in'],
    ['half', 'none'],
  ])('%s/%s: 3 and 8 spokes lay out at preferred and min size; hub, cards and text never overlap or leave the block', (layoutMode, connector) => {
    for (const size of [SZ, MIN]) {
      for (const n of [3, 5, 8]) {
        const t = lay({ spokes: spokes(n, true), layout: layoutMode, connector }, size)
        assertChartSane(t, size)
        const cards = rectsOf(t, /^spoke\[\d+\]$/)
        expect(cards).toHaveLength(n)
        assertNoOverlap([...cards, ...rectsOf(t, /^hub$/)])
        for (const c of cards) expect(within(c, { part: 'b', x: 0, y: 0, ...size }, 1)).toBe(true)
        for (const l of rectsOf(t, /^(label|text)\[/)) expect(within(l, cards[Number(/\[(\d+)\]/.exec(l.part)![1])], 1)).toBe(true)
      }
    }
  })

  it('links start on the hub circle, end at the card edge and never pass through another node', () => {
    for (const mode of ['circle', 'half']) {
      const t = lay({ spokes: spokes(6), layout: mode, connector: 'line' })
      const hub = rectsOf(t, /^hub$/)[0]
      const cards = rectsOf(t, /^spoke\[\d+\]$/)
      const hr = hub.width / 2
      const hc = { x: hub.x + hr, y: hub.y + hr }
      const links = absoluteLeaves(t).filter((l) => /^link\[\d+\]$/.test(l.part ?? ''))
      expect(links).toHaveLength(6)
      links.forEach((l) => {
        const { a, b } = ends((l.node as any).d)
        const i = Number(/\[(\d+)\]/.exec(l.part!)![1])
        expect(Math.abs(Math.hypot(a.x - hc.x, a.y - hc.y) - hr)).toBeLessThan(1.5)
        const c = cards[i]
        const onEdge = b.x >= c.x - 1.5 && b.x <= c.x + c.width + 1.5 && b.y >= c.y - 1.5 && b.y <= c.y + c.height + 1.5
        expect(onEdge).toBe(true)
        // sample the segment: outside the hub and every other card
        for (let k = 0.05; k < 0.95; k += 0.05) {
          const p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
          expect(Math.hypot(p.x - hc.x, p.y - hc.y)).toBeGreaterThanOrEqual(hr - 1)
          cards.forEach((o, j) => {
            if (j === i) return
            expect(p.x > o.x && p.x < o.x + o.width && p.y > o.y && p.y < o.y + o.height).toBe(false)
          })
        }
      })
    }
  })

  it('connector styles: none draws no links, arrow-out/arrow-in add a head per link', () => {
    const heads = (c: string) => rectsOf(lay({ spokes: spokes(4), connector: c }), /^link\[\d+\]\.head$/).length
    expect(rectsOf(lay({ spokes: spokes(4), connector: 'none' }), /^link/)).toHaveLength(0)
    expect(heads('line')).toBe(0)
    expect(heads('arrow-out')).toBe(4)
    expect(heads('arrow-in')).toBe(4)
  })

  it('circle layout is centred on the hub; half layout keeps every spoke above the hub centre', () => {
    const t = lay({ spokes: spokes(5) })
    const hub = rectsOf(t, /^hub$/)[0]
    expect(hub.x + hub.width / 2).toBeCloseTo(SZ.width / 2, 0)
    expect(hub.y + hub.height / 2).toBeCloseTo(SZ.height / 2, 0)
    const h = lay({ spokes: spokes(5), layout: 'half' })
    const hh = rectsOf(h, /^hub$/)[0]
    for (const c of rectsOf(h, /^spoke\[/)) expect(c.y + c.height / 2).toBeLessThanOrEqual(hh.y + hh.height / 2 + 1)
  })

  it('missing hub or empty spokes render a placeholder, never NaN', () => {
    for (const p of [{ hub: null, spokes: spokes(3) }, { hub: { label: 'x' }, spokes: [] }, { hub: { label: 'x' }, spokes: [null, 3, { label: 'ok' }] }]) {
      expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
    }
  })

  it('capacity: nine spokes fail with a remedy', () => {
    expect(tlsGHubSpoke.capacity!({ spokes: spokes(9) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})
