/**
 * tls.g.staircase (vivid V4) — steps rise monotonically, text above its own step and inside the box.
 */

import { tlsGStaircase } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, assertExampleFits } from '../../data/_chart/chart-test'
import { assertNoOverlap, layoutOf, rectsOf, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1100, height: 560 }
const MIN = { width: 600, height: 340 }
const steps = (n: number, long = false) =>
  Array.from({ length: n }, (_, i) => ({ label: long ? `Level ${i + 1} with a longer name` : `Level ${i + 1}`, text: long ? 'A note that runs on for quite a few words here' : `Note ${i + 1}`, icon: 'star' }))

standardBlockSuite(tlsGStaircase, { overflowProps: { steps: steps(8) } })

describe('tls.g.staircase', () => {
  it.each([3, 4, 6])('%i steps: rising, no overlaps, text above its own step', (n) => {
    for (const size of [SZ, MIN]) {
      for (const long of [false, true]) {
        const t = layoutOf(tlsGStaircase, { steps: steps(n, long) }, size)
        assertChartSane(t, size)
        const bars = rectsOf(t, /^step\[/)
        expect(bars).toHaveLength(n)
        for (let i = 1; i < n; i++) expect(bars[i].height).toBeGreaterThan(bars[i - 1].height)
        for (const b of bars) expect(b.y + b.height).toBeCloseTo(size.height, 0)
        assertNoOverlap(rectsOf(t, /^(label|note|icon)\[/))
        for (const l of rectsOf(t, /^(label|note|icon)\[/)) {
          const bar = bars[Number(/\[(\d+)\]/.exec(l.part)![1])]
          expect(l.y + l.height).toBeLessThanOrEqual(bar.y + 1)
          expect(l.x).toBeGreaterThanOrEqual(bar.x - 1)
          expect(l.x + l.width).toBeLessThanOrEqual(bar.x + bar.width + 1)
        }
      }
    }
  })

  it('numbers sit on their steps; numbering none drops them', () => {
    expect(rectsOf(layoutOf(tlsGStaircase, {}, SZ), /^num\[/)).toHaveLength(4)
    expect(rectsOf(layoutOf(tlsGStaircase, { numbering: 'none' }, SZ), /^num\[/)).toHaveLength(0)
  })

  it('motion targets exist', () => assertMotionTargetsExist(tlsGStaircase))
  it('the example fits its sizes', () => assertExampleFits(tlsGStaircase))
})
