/**
 * spro enhance PLAN.md L1 — the quality gate measures balance (the empty band under the content,
 * the tallest gap between blocks) and where the slide title sits (for title drift across slides).
 */
import { analyzeDeck } from '../layout-report'
import type { BlockSpec, DeckSpec, SlideSpec } from '../types'
import { slideQuality } from './quality'

const T = (text: string, props: Record<string, unknown> = {}): BlockSpec => ({ id: 't', type: 'tls.t.title', props: { text, ...props } })
const B = (id: string, text: string): BlockSpec => ({ id, type: 'tls.t.body', props: { text } })
const deck = (slide: SlideSpec): DeckSpec => ({ version: 1, id: 'q', title: 'q', theme: 'minimal-white', style: 'minimal', aspect: 'widescreen', slides: [slide] }) as DeckSpec
const quality = (slide: SlideSpec, balance = false) => slideQuality(analyzeDeck(deck(slide))[0], { balance })
const cards = (n: number): BlockSpec => ({
  id: 'row',
  type: 'tls.l.row',
  props: { children: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, type: 'tls.l.card', props: { children: [{ id: `h${i}`, type: 'tls.t.title', props: { text: `Card ${i + 1}`, size: 'subheading' } }, B(`b${i}`, 'One short line of text.')] } })) },
})
const takeaway: BlockSpec = { id: 'tk', type: 'tls.t.takeaway', props: { text: 'What to remember from these cards.' } }

describe('quality balance measures', () => {
  it('a short column under a title leaves most of the slide empty below it', () => {
    const q = quality({ id: 's', layout: 'two-column', regions: { title: [T('Short')], left: [B('a', 'One line.')], right: [B('b', 'Another line.')] } })
    expect(q.bottomGap).toBeGreaterThan(0.5)
    expect(q.innerGap).toBeLessThan(q.bottomGap)
    expect(q.topGap).toBeLessThan(0.1)
  })

  it('a statement centred on a blank slide has as much space above as below', () => {
    const q = quality({ id: 's', layout: 'blank', regions: { content: [{ id: 'st', type: 'tls.t.statement', props: { text: 'One strong sentence.' } }] } })
    expect(q.bottomGap).toBeGreaterThan(0.2)
    expect(Math.abs(q.bottomGap - q.topGap)).toBeLessThan(0.1)
  })

  it('a decoration at the bottom is not content', () => {
    const deco: BlockSpec = { id: 'd', type: 'tls.m.decoration', layer: 'overlay', anchor: 'bottom-right', props: { shape: 'squiggle' } } as BlockSpec
    const plain = quality({ id: 's', layout: 'two-column', regions: { title: [T('Short')], left: [B('a', 'One line.')], right: [B('b', 'Another.')] } })
    const decorated = quality({ id: 's', layout: 'two-column', regions: { title: [T('Short')], left: [B('a', 'One line.')], right: [B('b', 'Another.'), deco] } })
    expect(decorated.bottomGap).toBeCloseTo(plain.bottomGap, 2)
  })

  it('reports the title text box and size; a centred title starts further right', () => {
    const left = quality({ id: 's', layout: 'two-column', regions: { title: [T('A title')], left: [B('a', 'x')], right: [B('b', 'y')] } })
    const centred = quality({ id: 's', layout: 'two-column', regions: { title: [T('A title', { align: 'center' })], left: [B('a', 'x')], right: [B('b', 'y')] } })
    expect(left.title?.fontSize).toBeGreaterThan(40)
    expect(centred.title!.x).toBeGreaterThan(left.title!.x + 200)
  })

  it("valign 'auto' centres short columns: as much space below the content as above it", () => {
    const regions = { title: [T('Short')], left: [B('a', 'One line.')], right: [B('b', 'Another line.')] }
    const top = quality({ id: 's', layout: 'two-column', regions }, true)
    const auto = quality({ id: 's', layout: 'two-column', valign: 'auto', regions }, true)
    expect(top.findings.map((f) => f.code)).toContain('quality/unbalanced')
    // topGap also holds the layout's own gap under the title (~5 %)
    expect(Math.abs(auto.bottomGap - auto.topGap)).toBeLessThan(0.1)
    expect(auto.findings.map((f) => f.code)).not.toContain('quality/unbalanced')
  })

  it('a row of cards and a takeaway under it stay together in a centred region', () => {
    const q = quality({ id: 's', layout: 'timeline', regions: { title: [T('Recap')], timeline: [cards(4), takeaway] } }, true)
    expect(q.innerGap).toBeLessThan(0.1)
    expect(q.findings.map((f) => f.code)).not.toContain('quality/unbalanced')
  })

  it('without `balance` an unbalanced page is measured, not judged', () => {
    const q = quality({ id: 's', layout: 'two-column', regions: { title: [T('Short')], left: [B('a', 'x')], right: [B('b', 'y')] } })
    expect(q.bottomGap).toBeGreaterThan(0.5)
    expect(q.findings.map((f) => f.code)).not.toContain('quality/unbalanced')
  })

  it('a balanced slide must fill at least half of the safe area', () => {
    const regions = { title: [T('Short')], left: [B('a', 'One line.')], right: [B('b', 'Another line.')] }
    const judged = quality({ id: 's', layout: 'two-column', valign: 'auto', regions }, true)
    expect(judged.fill).toBeLessThan(0.5)
    expect(judged.findings.map((f) => f.code)).toContain('quality/sparse')
  })
})

describe('an empty region', () => {
  it('a comparison slide with its one block in `left` has an empty right half (spro deck 5a45a329 s7)', () => {
    const cmp: BlockSpec = { id: 'c', type: 'tls.c.comparison', props: { columns: [{ title: 'Luôn phải có', items: ['Khai báo thư viện', 'Hàm main'] }, { title: 'Có thể không có', items: ['Biến tổng thể', 'Các hàm'] }] } }
    const q = quality({ id: 's', layout: 'comparison', regions: { title: [T('Phần nào bắt buộc')], left: [cmp] } })
    expect(q.regionFill).toBe(0)
    expect(q.thinRegion).toBe('right')
    expect(q.findings.find((f) => f.code === 'quality/thin-region')?.message).toContain('is empty')
  })
})
