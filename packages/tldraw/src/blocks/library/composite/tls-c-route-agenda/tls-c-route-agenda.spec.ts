/** tls.c.route-agenda — spro creative CR8 (the shared wave-1 suite). */
import { tlsCRouteAgenda, buildRouteAgenda } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCRouteAgenda, build: buildRouteAgenda, category: 'agenda', scope: 'slide',
  overflow: { stops: Array.from({ length: 8 }, (_, i) => ({ label: `Stop ${i}` })) },
  variants: { slot: 'variant', values: ["road", "metro", "stepping-stones", "river"] },
  long: { stops: Array.from({ length: 6 }, (_, i) => ({ label: `Stop ${i} of the route`, note: 'A short note about it' })) }, parts: ["route"],
})

describe('S24-j: seven stops are read, not squeezed into one row', () => {
  const { analyzeSlide } = require('../../../layout-report')
  const stops = ['Điều gì thay đổi từ 01/03/2028', 'Ba nhóm rác và màu túi', 'Mẹo phân loại trong 10 giây', 'Lịch thu gom và giờ đặt rác', 'Rác nguy hại và rác cồng kềnh', 'Phí thu gom mới và mức xử phạt', 'Lộ trình, câu hỏi, việc cần làm ngay'].map((label) => ({ label }))
  const sizes = (n: number, variant: string, layout = 'blank', region = 'content') => {
    const r = analyzeSlide({ id: 's', layout, regions: { title: [{ id: 't', type: 'tls.t.title', props: { text: 'Nội dung buổi họp hôm nay' } }], [region]: [{ id: 'a', type: 'tls.c.route-agenda', props: { title: 'Bảy chặng', stops: stops.slice(0, n), variant } }] } })
    const b = r.blocks.find((x: { id: string }) => x.id === 'a')
    const px = b.text.filter((t: { part?: string }) => !/title/.test(t.part ?? '')).map((t: { fontSize: number; scale: number }) => t.fontSize * t.scale)
    return { min: Math.min(...px), read: px.filter((x: number) => x >= 28).length, findings: r.findings.map((f: { code: string }) => f.code) }
  }
  it.each(['stepping-stones', 'road', 'river', 'metro'])('%s with 7 stops: every stop at ≥ 28 units, no text under 22', (v) => {
    const s = sizes(7, v)
    expect(s.read).toBeGreaterThanOrEqual(7) // the stops (their number badges are 0.8 of that)
    expect(s.min).toBeGreaterThanOrEqual(22)
    expect(s.findings).not.toContain('slide/overflow')
  })
  it.each([['timeline', 'timeline'], ['band', 'band']])('in the r1 agendas\' layout %s', (layout, region) => {
    const s = sizes(7, 'stepping-stones', layout, region)
    expect(s.read).toBeGreaterThanOrEqual(7)
    expect(s.min).toBeGreaterThanOrEqual(22)
  })
})
