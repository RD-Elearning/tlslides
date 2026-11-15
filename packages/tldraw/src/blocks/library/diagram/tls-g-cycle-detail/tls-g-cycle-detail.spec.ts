/** tls.g.cycle-detail — spro sprint 2026-11b S09: stages beside the ring, no overlap, text clear of the art. */
import { tlsGCycleDetail } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, layoutOf, rectsOf, overlap } from '../diagram-test'

const V = 'Nước bốc hơi từ biển và hồ khi mặt trời làm nóng, rồi bay lên cao thành hơi nước trong không khí lạnh dần đi'
const stages = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `Giai đoạn ${i + 1}: tên khá dài một chút`.slice(0, 32), text: V.slice(0, 110) }))

standardBlockSuite(tlsGCycleDetail, { overflowProps: { stages: stages(7) } })

describe('tls.g.cycle-detail', () => {
  it.each([['ring'], ['ring-cards']])('%s: 3–6 long stages at preferred and min size — no text overlaps, no stage text on the ring art, all in the box', (variant) => {
    for (const size of [{ width: 1600, height: 760 }, { width: 1200, height: 620 }]) {
      for (const n of [3, 4, 5, 6]) {
        const t = layoutOf(tlsGCycleDetail, { stages: stages(n), center: 'Vòng tuần hoàn của nước', variant }, size)
        assertChartSane(t, size)
        const dots = rectsOf(t, /^dot\[\d+\]$/)
        expect(dots).toHaveLength(n)
        const texts = rectsOf(t, /^(title|text|mark|center)\[?\d*\]?/)
        assertNoOverlap(texts.filter((r) => !/^center/.test(r.part)), 1)
        const ring = rectsOf(t, /^ring$/)[0]
        for (const r of rectsOf(t, /^(title|text)\[/)) expect([n, r.part, overlap(r, ring, 1)]).toEqual([n, r.part, 0])
        for (const d of dots) for (const r of texts) expect([n, d.part, r.part, overlap(r, d, 1)]).toEqual([n, d.part, r.part, 0])
      }
    }
  })
})
