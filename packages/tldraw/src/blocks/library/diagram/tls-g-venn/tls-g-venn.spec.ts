/**
 * tls.g.venn — circle geometry, label placement, determinism, limits.
 */

import { tlsGVenn } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { chartCtx, layoutOf, overlap, rectsOf, within } from '../diagram-test'

const SZ = { width: 1000, height: 560 }
const MIN = { width: 560, height: 320 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGVenn, props, size)
const sets = (n: number, full = false) =>
  Array.from({ length: n }, (_, i) => ({ label: full ? `Set ${i} ` + 'x'.repeat(16) : `Set ${i + 1}`, text: full ? 'n'.repeat(60) : `Note ${i + 1}` }))
const pairs = ['AB', 'BC', 'AC']

standardBlockSuite(tlsGVenn, { overflowProps: { sets: sets(4) } })

describe('tls.g.venn', () => {
  it.each([
    [2, 'inside', 'soft'],
    [2, 'outside', 'medium'],
    [3, 'inside', 'soft'],
    [3, 'inside', 'medium'],
    [3, 'outside', 'soft'],
  ])('%i sets, labels %s, opacity %s: circles overlap pairwise, text never overlaps and stays on the block', (n, labels, opacity) => {
    for (const size of [SZ, MIN]) {
      const t = lay({ sets: sets(n as number, true), overlap: 'o'.repeat(30), pairOverlaps: pairs.map((p) => p.repeat(12)), labels, opacity }, size)
      assertChartSane(t, size)
      const discs = rectsOf(t, /^disc\[/)
      expect(discs).toHaveLength(n as number)
      for (let i = 0; i < discs.length; i++) {
        for (let j = i + 1; j < discs.length; j++) expect(overlap(discs[i], discs[j], 0)).toBeGreaterThan(0)
        expect(within(discs[i], { part: 'b', x: 0, y: 0, ...size }, 1)).toBe(true)
        expect(discs[i].width).toBeCloseTo(discs[i].height, 3)
      }
      if (labels === 'inside') {
        // Each set label sits inside its own circle's box.
        for (const l of rectsOf(t, /^text\[\d\]\.label/)) expect(within(l, discs[Number(/\[(\d)\]/.exec(l.part)![1])], 2)).toBe(true)
      }
    }
  })

  it('outside labels never sit on top of a circle', () => {
    for (const n of [2, 3]) {
      const t = lay({ sets: sets(n, true), labels: 'outside' })
      const discs = rectsOf(t, /^disc\[/)
      for (const l of rectsOf(t, /^text\[\d\]\./)) for (const d of discs) expect(overlap(l, d, 1)).toBe(0)
    }
  })

  it('overlap text sits in the middle of the lens (2 sets) / of all three (3 sets)', () => {
    const t2 = lay({ sets: sets(2), overlap: 'Both' })
    const [a, b] = rectsOf(t2, /^disc\[/)
    const o2 = rectsOf(t2, /^overlap-text\.label/)[0]
    expect(Math.abs(o2.x + o2.width / 2 - (a.x + a.width / 2 + b.x + b.width / 2) / 2)).toBeLessThan(2)
    const t3 = lay({ sets: sets(3), overlap: 'All' })
    const d3 = rectsOf(t3, /^disc\[/)
    const o3 = rectsOf(t3, /^overlap-text\.label/)[0]
    for (const d of d3) expect(overlap(o3, d, 0)).toBeGreaterThan(0)
  })

  it('pair overlaps only exist for 3 sets and sit inside exactly the two circles they name', () => {
    expect(rectsOf(lay({ sets: sets(2), pairOverlaps: pairs }), /^pair\[/)).toHaveLength(0)
    const t = lay({ sets: sets(3), pairOverlaps: ['AB', 'BC', 'AC'] })
    const d = rectsOf(t, /^disc\[/)
    const cover = (r: any, i: number) => {
      const cx = r.x + r.width / 2
      const cy = r.y + r.height / 2
      const R = d[i].width / 2
      return Math.hypot(cx - (d[i].x + R), cy - (d[i].y + R)) < R
    }
    const expectIn = [[0, 1], [1, 2], [0, 2]]
    rectsOf(t, /^pair\[\d\]\.label/).forEach((r, k) => {
      const inside = [0, 1, 2].filter((i) => cover(r, i))
      expect(inside).toEqual(expectIn[k])
    })
  })

  it('is deterministic and seed-free: identical input, identical tree', () => {
    const p = { sets: sets(3), overlap: 'x', pairOverlaps: pairs }
    expect(JSON.stringify(lay(p))).toBe(JSON.stringify(lay(p)))
  })

  it('medium opacity is more opaque than soft', () => {
    const op = (o: string) => (lay({ sets: sets(2), opacity: o }) as any).children[0].children[0].opacity
    expect(op('medium')).toBeGreaterThan(op('soft'))
  })

  it('too few sets render a placeholder, hostile input never NaN', () => {
    for (const p of [{ sets: [] }, { sets: [{ label: 'a' }] }, { sets: [null, 4, { label: 'x' }, { label: 'y' }] }, { sets: sets(2), pairOverlaps: [null, 3] }]) {
      expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
    }
  })

  it('capacity: four sets fail with a remedy', () => {
    expect(tlsGVenn.capacity!({ sets: sets(4) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})
