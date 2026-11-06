/** tls.g.concept-map — spro sprint 2026-11b S09: auto layout, no overlap, label clearance, link-id lint. */
import { tlsGConceptMap, lint } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, layoutOf, rectsOf } from '../diagram-test'
import { clearance, type Pt } from '../_geo'
import { pathBounds } from '../_kit'
import { absoluteLeaves } from '../../text/standard-suite'

const NINE = {
  nodes: 'abcdefghi'.split('').map((id, i) => ({ id, label: `Khái niệm số ${i + 1} khá dài`, detail: i % 3 ? '' : 'Một dòng giải thích ngắn cho khái niệm' })),
  links: [['a', 'b'], ['a', 'c'], ['a', 'd'], ['a', 'e'], ['b', 'f'], ['c', 'g'], ['d', 'h'], ['e', 'i'], ['f', 'g'], ['h', 'i'], ['b', 'c'], ['d', 'e'], ['g', 'a'], ['i', 'a']].map(([from, to]) => ({ from, to, label: 'dẫn tới' })),
}

standardBlockSuite(tlsGConceptMap, { overflowProps: { nodes: Array.from({ length: 10 }, (_, i) => ({ id: 'n' + i, label: 'x' })) } })

function samples(t: any): Pt[][] {
  return absoluteLeaves(t)
    .filter((l) => /^link\[\d+\]$/.test(l.part ?? ''))
    .map((l) => {
      const d: string = (l.node as any).d
      const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
      const pts: Pt[] = []
      if (d.includes('Q')) {
        const [ax, ay, cx, cy, bx, by] = nums
        for (let i = 0; i <= 40; i++) {
          const s = i / 40
          pts.push({ x: (1 - s) ** 2 * ax + 2 * (1 - s) * s * cx + s * s * bx, y: (1 - s) ** 2 * ay + 2 * (1 - s) * s * cy + s * s * by })
        }
      } else {
        const [ax, ay, bx, by] = nums
        for (let i = 0; i <= 40; i++) pts.push({ x: ax + ((bx - ax) * i) / 40, y: ay + ((by - ay) * i) / 40 })
      }
      return pts
    })
}

describe('tls.g.concept-map', () => {
  it.each([['radial'], ['layered'], ['cluster']])('%s: 9 concepts and 14 links in a half region — no node or label overlaps, every label ≥ 8 from every line, no line through a node', (variant) => {
    for (const size of [{ width: 900, height: 760 }, { width: 1400, height: 760 }]) {
      const t = layoutOf(tlsGConceptMap, { ...NINE, variant }, size)
      assertChartSane(t, size)
      const nodes = rectsOf(t, /^node\[\d+\]$/)
      expect(nodes).toHaveLength(9)
      const labels = rectsOf(t, /^linkLabel\[\d+\]/)
      expect(labels.length).toBeGreaterThan(0)
      assertNoOverlap([...nodes, ...labels], 1)
      const lines = samples(t)
      expect(lines).toHaveLength(14)
      for (const l of labels) expect([variant, size.width, l.part, Math.min(...lines.map((p) => clearance(l, p))) >= 7.5]).toEqual([variant, size.width, l.part, true])
      lines.forEach((pts, k) => {
        // endpoints sit at their own nodes' edges: check only the inner part of the line
        const inner = pts.slice(4, -4)
        const crossed = nodes.filter((n) => clearance(n, inner) < 1)
        expect([variant, k, crossed.length <= 0]).toEqual([variant, k, true])
      })
      void pathBounds
    }
  })

  it('a sparser map keeps the authored arrangement (layered = rows by depth, cluster = a grid)', () => {
    const SIX = { nodes: 'abcdef'.split('').map((id, i) => ({ id, label: `Khái niệm ${i + 1}` })), links: [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'e'], ['c', 'f'], ['d', 'e']].map(([from, to]) => ({ from, to, label: 'dẫn tới' })) }
    const rowsOf = (variant: string) => new Set(rectsOf(layoutOf(tlsGConceptMap, { ...SIX, variant }, { width: 1400, height: 760 }), /^node\[\d+\]$/).map((n) => Math.round(n.y / 120))).size
    expect(rowsOf('cluster')).toBe(2)
    expect(rowsOf('layered')).toBeGreaterThanOrEqual(3)
    // radial: the most linked concept (c, 3 links) in the centre
    const c = rectsOf(layoutOf(tlsGConceptMap, { ...SIX, variant: 'radial' }, { width: 1400, height: 760 }), /^node\[2\]$/)[0]
    expect(Math.abs(c.x + c.width / 2 - 700)).toBeLessThan(2)
    expect(Math.abs(c.y + c.height / 2 - 380)).toBeLessThan(2)
  })

  it('a link to an unknown id is a validation error, and is not drawn', () => {
    const bad = { ...NINE, links: [...NINE.links.slice(0, 3), { from: 'a', to: 'zz', label: 'x' }] }
    const f = lint(bad as any)
    expect(f.map((x) => x.rule)).toEqual(['concept-map/unknown-id'])
    expect(f[0].part).toBe('links[3].to')
    const t = layoutOf(tlsGConceptMap, bad, { width: 1400, height: 760 })
    expect(rectsOf(t, /^link\[\d+\]$/)).toHaveLength(3)
    expect(tlsGConceptMap.lintIsValidation).toBe(true)
  })
})
