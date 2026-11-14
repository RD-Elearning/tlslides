/**
 * spro sprint 2026-11c S24-b: the report names a word cut across a line end (`text/cut-word`),
 * so the composer sees "Delivera|bles" without a screenshot.
 */
import { analyzeSlide } from '../layout-report'

const cards = (titles: string[]) => ({
  id: 'c',
  type: 'tls.c.cards',
  props: { columns: titles.length, cards: titles.map((title) => ({ title, text: 'Một dòng ngắn.' })) },
})

describe('text/cut-word', () => {
  it('six cards in one row cut a long word, and the report says so', () => {
    const slide = { id: 's', layout: 'blank', regions: { content: [cards(['Deliverables', 'Internationalization', 'Accessibility', 'Responsibilities', 'Documentation', 'Configuration'])] } }
    const report = analyzeSlide(slide as never)
    const b = report.blocks.find((x) => x.id === 'c')!
    expect(b.cutWords ?? 0).toBeGreaterThan(0)
    expect(report.findings.some((f) => f.code === 'text/cut-word' && f.blockIds.includes('c'))).toBe(true)
  })

  it('short words in two cards: no finding', () => {
    const slide = { id: 's', layout: 'blank', regions: { content: [cards(['Vai trò', 'Chất lượng'])] } }
    const report = analyzeSlide(slide as never)
    expect(report.blocks.find((x) => x.id === 'c')!.cutWords).toBeUndefined()
    expect(report.findings.some((f) => f.code === 'text/cut-word')).toBe(false)
  })
})
