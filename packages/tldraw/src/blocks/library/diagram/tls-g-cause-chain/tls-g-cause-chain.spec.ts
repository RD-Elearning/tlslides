/** tls.g.cause-chain — spro sprint 2026-11b S09: bands, arrows edge to edge, no overlap, no line through a box. */
import { tlsGCauseChain } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, layoutOf, rectsOf } from '../diagram-test'
import { clearance } from '../_geo'
import { absoluteLeaves } from '../../text/standard-suite'

const V = 'Rừng bị chặt để lấy đất trồng trọt và chăn nuôi, làm giảm lượng cây hấp thụ khí các-bô-níc trong không khí'.slice(0, 90)

standardBlockSuite(tlsGCauseChain, { overflowProps: { causes: ['a', 'b', 'c', 'd', 'e'] } })

describe('tls.g.cause-chain', () => {
  it.each([['columns'], ['funnel-in']])('%s: 1–4 causes, 0–3 consequences at max length — boxes apart, arrows clear of other boxes', (variant) => {
    for (const size of [{ width: 1600, height: 700 }, { width: 1200, height: 600 }]) {
      for (const [nc, nq] of [[1, 0], [2, 2], [4, 3], [3, 1]]) {
        const t = layoutOf(tlsGCauseChain, { causes: Array(nc).fill(V), effect: V, consequences: Array(nq).fill(V), variant }, size)
        assertChartSane(t, size)
        const boxes = rectsOf(t, /\.box$/)
        expect(boxes).toHaveLength(nc + 1 + nq)
        assertNoOverlap(boxes, 1)
        const lines = absoluteLeaves(t).filter((l) => /^arrow\[\d+\]\.line$/.test(l.part ?? ''))
        expect(lines).toHaveLength(nc + nq)
        for (const l of lines) {
          const [ax, ay, bx, by] = (l.node as any).d.match(/-?\d+(\.\d+)?/g).map(Number)
          const pts = Array.from({ length: 21 }, (_, i) => ({ x: ax + ((bx - ax) * i) / 20, y: ay + ((by - ay) * i) / 20 }))
          for (const b of boxes) expect([variant, nc, nq, l.part, b.part, clearance(b, pts) >= 4]).toEqual([variant, nc, nq, l.part, b.part, true])
        }
      }
    }
  })
})
