/**
 * spro sprint 2026-11b S04 — ink measures of the quality gate: `bodyInk` (how much of the body's
 * boxes is words), `bodyChars` (reading text outside the title) and `hollow` (card-like boxes
 * stretched far past their content). Measures only: no finding comes from them.
 */
import { analyzeDeck } from '../layout-report'
import type { BlockSpec, DeckSpec, SlideSpec } from '../types'
import { slideQuality } from './quality'

const T = (text: string): BlockSpec => ({ id: 't', type: 'tls.t.title', props: { text } })
const deck = (slide: SlideSpec): DeckSpec => ({ version: 1, id: 'q', title: 'q', theme: 'minimal-white', style: 'minimal', aspect: 'widescreen', slides: [slide] }) as DeckSpec
const quality = (slide: SlideSpec) => slideQuality(analyzeDeck(deck(slide))[0])

const LONG = 'A worked example from the chapter, with the step that most students get wrong and the reason the rule holds in every case we have seen.'
const cards = (text?: string): BlockSpec => ({
  id: 'k',
  type: 'tls.c.cards',
  props: { lead: 'none', cards: ['Inputs', 'Model', 'Output', 'Check'].map((title) => ({ title, ...(text ? { text } : {}) })) },
})

describe('quality ink measures', () => {
  it('a row of 4 cards with 2-word titles in a full region is hollow', () => {
    const q = quality({ id: 's', layout: 'timeline', regions: { title: [T('Four parts')], timeline: [cards()] } })
    expect(q.hollow.map((h) => h.block)).toContain('k')
    const h = q.hollow.find((x) => x.block === 'k')!
    expect(h.ink).toBeLessThan(0.22)
  })

  it('the same row with 3-line descriptions is not hollow', () => {
    const q = quality({ id: 's', layout: 'timeline', regions: { title: [T('Four parts')], timeline: [cards(LONG)] } })
    expect(q.hollow).toEqual([])
    // leaf chars drop the space at each wrap: ≈ 4 × LONG + the titles
    expect(q.bodyChars).toBeGreaterThan(3.8 * LONG.length)
  })

  it('a bullets block with 4 short items in a full region has little ink', () => {
    const q = quality({ id: 's', layout: 'timeline', regions: { title: [T('Short list')], timeline: [{ id: 'b', type: 'tls.t.bullets', props: { items: ['One', 'Two', 'Three', 'Four'].map((text) => ({ text })) } }] } })
    expect(q.bodyInk).toBeLessThan(0.15)
    // the bullet markers are leaves too (one char each)
    expect(q.bodyChars).toBeGreaterThanOrEqual('OneTwoThreeFour'.length)
    expect(q.bodyChars).toBeLessThanOrEqual('OneTwoThreeFour'.length + 4)
  })

  it('the title is not body text', () => {
    const q = quality({ id: 's', layout: 'timeline', regions: { title: [T('A long title that should not count as body text')], timeline: [{ id: 'b', type: 'tls.t.body', props: { text: 'Body.' } }] } })
    expect(q.bodyChars).toBe(5)
  })
})
