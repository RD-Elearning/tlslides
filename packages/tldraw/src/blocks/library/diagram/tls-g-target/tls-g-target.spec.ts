/**
 * tls.g.target (vivid V4) — concentric annuli without overlap, labels beside, leaders, ring names.
 */

import { tlsGTarget } from './index'
import { allNodes, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, assertExampleFits } from '../../data/_chart/chart-test'
import { assertNoOverlap, layoutOf, rectsOf, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1100, height: 560 }
const MIN = { width: 600, height: 320 }
const rings = (n: number, long = false) =>
  Array.from({ length: n }, (_, i) => ({ label: long ? `Ring ${i + 1} with a longer name` : `Ring ${i + 1}`, text: long ? 'A note that runs on for a good number of words' : `Note ${i + 1}` }))

standardBlockSuite(tlsGTarget, { overflowProps: { rings: rings(7) } })

describe('tls.g.target', () => {
  it.each([2, 3, 5])('%i rings: nested bands, the outermost the widest, text beside them', (n) => {
    for (const size of [SZ, MIN]) {
      for (const long of [false, true]) {
        const t = layoutOf(tlsGTarget, { rings: rings(n, long) }, size)
        assertChartSane(t, size)
        // (the bands are arc paths: `rectsOf` reads number pairs, not arcs, so measure the slots)
        expect(rectsOf(t, /^ring\[/)).toHaveLength(n)
        const slots = allNodes(t).filter((x) => /^band\[\d+\]$/.test(x.part ?? ''))
        for (let i = 1; i < n; i++) expect(slots[i].box.width).toBeGreaterThan(slots[i - 1].box.width)
        const right = Math.max(...slots.map((b) => b.box.x + b.box.width))
        for (const l of rectsOf(t, /^(label|note)\[/)) expect(l.x).toBeGreaterThan(right)
        assertNoOverlap(rectsOf(t, /^(label|note)\[/))
        expect(rectsOf(t, /^leader\[/)).toHaveLength(n)
      }
    }
  })

  it('labels none: the names sit on the rings, no leaders', () => {
    const t = layoutOf(tlsGTarget, { labels: 'none' }, SZ)
    assertChartSane(t, SZ)
    expect(rectsOf(t, /^leader\[/)).toHaveLength(0)
    expect(rectsOf(t, /^label\[/).length).toBeGreaterThanOrEqual(3)
  })

  it('motion targets exist', () => assertMotionTargetsExist(tlsGTarget))
  it('the example fits its sizes', () => assertExampleFits(tlsGTarget))
})
