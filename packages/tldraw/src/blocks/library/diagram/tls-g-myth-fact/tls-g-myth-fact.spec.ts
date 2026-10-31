/**
 * tls.g.myth-fact (vivid V4) — rows in order, myth left / fact right, texts in their panels.
 */

import { tlsGMythFact } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, assertExampleFits } from '../../data/_chart/chart-test'
import { assertNoOverlap, layoutOf, rectsOf, within, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1200, height: 560 }
const MIN = { width: 700, height: 320 }
const rows = (n: number, long = false) =>
  Array.from({ length: n }, (_, i) => ({ myth: long ? `A common belief number ${i + 1} that many people repeat` : `Myth ${i + 1}`, fact: long ? 'What the evidence shows instead, written out over a couple of lines of text here' : `Fact ${i + 1}` }))

standardBlockSuite(tlsGMythFact, { overflowProps: { rows: rows(6) } })

describe('tls.g.myth-fact', () => {
  it.each([1, 2, 4])('%i rows: panels in order, texts inside their panels', (n) => {
    for (const size of [SZ, MIN]) {
      for (const long of [false, true]) {
        const t = layoutOf(tlsGMythFact, { rows: rows(n, long) }, size)
        assertChartSane(t, size)
        const mp = rectsOf(t, /^mpanel\[/)
        const fp = rectsOf(t, /^fpanel\[/)
        expect(mp).toHaveLength(n)
        expect(fp).toHaveLength(n)
        assertNoOverlap([...mp, ...fp])
        for (let i = 1; i < n; i++) expect(mp[i].y).toBeGreaterThan(mp[i - 1].y)
        for (const l of rectsOf(t, /^mtext\[/)) expect(within(l, mp[Number(/\[(\d+)\]/.exec(l.part)![1])], 1)).toBe(true)
        for (const l of rectsOf(t, /^ftext\[/)) expect(within(l, fp[Number(/\[(\d+)\]/.exec(l.part)![1])], 1)).toBe(true)
        for (let i = 0; i < n; i++) expect(fp[i].x).toBeGreaterThan(mp[i].x + mp[i].width)
      }
    }
  })

  it('motion targets exist', () => assertMotionTargetsExist(tlsGMythFact))
  it('the example fits its sizes', () => assertExampleFits(tlsGMythFact))
})
