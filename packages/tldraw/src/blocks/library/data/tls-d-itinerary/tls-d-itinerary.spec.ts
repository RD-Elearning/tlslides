/** tls.d.itinerary — spro sprint 2026-11c S25: one card per day, filling the region, every text whole at the chosen tier. */
import { tlsDItinerary } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { layoutOf, assertNoOverlap, rectsOf } from '../../diagram/diagram-test'

standardBlockSuite(tlsDItinerary, { overflowProps: { days: Array.from({ length: 9 }, (_, i) => ({ label: `Ngày ${i + 1}`, title: 'A → B', stops: ['x'] })) } })

const four = [
  { label: 'Ngày 1', title: 'Hà Nội → Hà Giang → Quản Bạ', meta: '160 km', stops: ['Cột mốc số 0', 'Dốc Bắc Sum', 'Núi đôi Cô Tiên', 'Homestay người Dao ở Nặm Đăm'] },
  { label: 'Ngày 2', title: 'Quản Bạ → Yên Minh → Đồng Văn', meta: '110 km', stops: ['Rừng thông Yên Minh', 'Dốc Thẩm Mã', 'Dinh thự họ Vương', 'Cột cờ Lũng Cú'] },
  { label: 'Ngày 3', title: 'Đồng Văn → Mã Pí Lèng → Du Già', meta: '120 km', stops: ['Đèo Mã Pí Lèng', 'Thuyền sông Nho Quế', 'Chợ phiên Mèo Vạc'] },
  { label: 'Ngày 4', title: 'Du Già → Hà Nội', meta: '230 km', stops: ['Thác Du Già', 'Bữa trưa cơm lam'] },
]

describe('S25 itinerary', () => {
  it('four days in a content region: one row of cards that fill its height, every text whole, no overlap', () => {
    const t = layoutOf(tlsDItinerary, { days: four }, { width: 1728, height: 700 })
    const cards = rectsOf(t, /^card\[\d+\]$/)
    expect(cards).toHaveLength(4)
    expect(new Set(cards.map((c) => Math.round(c.y))).size).toBe(1)
    for (const c of cards) expect(c.height).toBeGreaterThan(690)
    const texts = absoluteLeaves(t).filter((l) => l.k === 'text')
    expect(texts.flatMap((l) => (l.node as any).lines.map((x: any) => x.text)).join(' ')).not.toContain('…')
    assertNoOverlap([...rectsOf(t, /^(title|meta|label|num)\[/), ...rectsOf(t, /^stop\[\d+\]\.\d+$/)])
  })
  it('a roomy region takes a larger type than a tight one', () => {
    const size = (h: number) => Math.max(...absoluteLeaves(layoutOf(tlsDItinerary, { days: four }, { width: 1728, height: h })).filter((l) => /^title\[/.test(l.part ?? '')).map((l) => (l.node as any).style.size))
    expect(size(800)).toBeGreaterThan(size(420))
  })
  it('six days take two rows of three', () => {
    const six = [...four, { label: 'Ngày 5', title: 'A → B' }, { label: 'Ngày 6', title: 'B → C' }]
    const t = layoutOf(tlsDItinerary, { days: six }, { width: 1728, height: 760 })
    expect(new Set(rectsOf(t, /^card\[\d+\]$/).map((r) => Math.round(r.y))).size).toBe(2)
  })
})
