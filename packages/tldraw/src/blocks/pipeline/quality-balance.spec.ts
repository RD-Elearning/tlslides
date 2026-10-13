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
const quality = (slide: SlideSpec) => slideQuality(analyzeDeck(deck(slide))[0])

describe('quality balance measures', () => {
  it('a short column under a title leaves most of the slide empty below it', () => {
    const q = quality({ id: 's', layout: 'two-column', regions: { title: [T('Short')], left: [B('a', 'One line.')], right: [B('b', 'Another line.')] } })
    expect(q.bottomGap).toBeGreaterThan(0.5)
    expect(q.innerGap).toBeLessThan(q.bottomGap)
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
})
