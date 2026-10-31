/**
 * learning L01 (D10) — `quality/min-type`: the smallest reading text of a slide against a floor for
 * its kind. Opt-in (`typeFloors`); decorative blocks, charts and diagrams, short runs and the title
 * are exempt.
 */
import { analyzeDeck } from '../layout-report'
import type { BlockSpec, DeckSpec, SlideSpec } from '../types'
import { DEFAULT_TYPE_FLOORS, slideQuality, textKind } from './quality'

const T = (text: string): BlockSpec => ({ id: 't', type: 'tls.t.title', props: { text } })
const B = (id: string, text: string, size?: string): BlockSpec => ({ id, type: 'tls.t.body', props: { text, ...(size ? { size } : {}) } })
const deck = (slide: SlideSpec): DeckSpec => ({ version: 1, id: 'q', title: 'q', theme: 'minimal-white', style: 'minimal', aspect: 'widescreen', slides: [slide] }) as DeckSpec
const codes = (slide: SlideSpec, floors: Parameters<typeof slideQuality>[1]['typeFloors'] = true) =>
  slideQuality(analyzeDeck(deck(slide))[0], { typeFloors: floors }).findings.filter((f) => f.code === 'quality/min-type')

const sentence = 'A full sentence of body text that is read by the class.'

describe('quality/min-type', () => {
  it('is off unless the caller asks', () => {
    const q = slideQuality(analyzeDeck(deck({ id: 's', layout: 'timeline', regions: { title: [T('Title')], timeline: [B('a', sentence)] } }))[0], {})
    expect(q.findings.map((f) => f.code)).not.toContain('quality/min-type')
  })

  it('body text under the floor is one finding naming the block and the size', () => {
    const slide: SlideSpec = { id: 's', layout: 'timeline', regions: { title: [T('Title')], timeline: [B('a', sentence)] } }
    expect(codes(slide, { body: 9999 })).toHaveLength(1)
    const f = codes(slide, { body: 9999 })[0]
    expect(f.message).toMatch(/body text at \d+ units \(floor 9999\) in tls\.t\.body `a`/)
    expect(codes(slide, { body: 1 })).toHaveLength(0)
  })

  it('the default floors pass ordinary body text on a roomy slide', () => {
    expect(DEFAULT_TYPE_FLOORS.body).toBe(24)
    expect(codes({ id: 's', layout: 'timeline', regions: { title: [T('Title')], timeline: [B('a', sentence)] } })).toHaveLength(0)
  })

  it('the title, short runs, decorations and charts are not judged', () => {
    expect(textKind('tls.t.title', 'title', { chars: 30 })).toBeNull()
    expect(textKind('tls.t.body', 'timeline', { chars: 3 })).toBeNull()
    expect(textKind('tls.m.decoration', 'timeline', { chars: 30 })).toBeNull()
    expect(textKind('tls.d.donut', 'timeline', { chars: 30, part: 'label' })).toBeNull()
    expect(textKind('tls.t.body', 'timeline', { chars: 30, part: 'glyph' })).toBeNull()
  })

  it('a label, a caption and a footnote are judged by their own floor', () => {
    expect(textKind('tls.c.card', 'left', { chars: 30, part: 'label' })).toBe('label')
    expect(textKind('tls.t.quote', 'left', { chars: 30, part: 'attribution' })).toBe('caption')
    expect(textKind('tls.t.body', 'left', { chars: 30, propPath: 'footer' })).toBe('footnote')
    expect(textKind('tls.t.body', 'left', { chars: 30, part: 'text' })).toBe('body')
  })

  it('a region packed with six cards falls under a body floor a roomy slide keeps', () => {
    const card = (i: number): BlockSpec => ({ id: `c${i}`, type: 'tls.l.card', props: { children: [B(`b${i}`, `Card ${i} says one fairly long thing that wraps over lines.`)] } })
    const six: SlideSpec = { id: 's', layout: 'timeline', regions: { title: [T('Six')], timeline: [{ id: 'g', type: 'tls.l.grid', props: { columns: 3, children: [0, 1, 2, 3, 4, 5].map(card) } }] } }
    const one: SlideSpec = { id: 's', layout: 'timeline', regions: { title: [T('One')], timeline: [{ id: 'g', type: 'tls.l.grid', props: { columns: 1, children: [card(0)] } }] } }
    const q6 = slideQuality(analyzeDeck(deck(six))[0], { typeFloors: { body: 30 } }).findings.filter((f) => f.code === 'quality/min-type')
    const q1 = slideQuality(analyzeDeck(deck(one))[0], { typeFloors: { body: 30 } }).findings.filter((f) => f.code === 'quality/min-type')
    expect(q6.length).toBeGreaterThanOrEqual(q1.length)
  })
})
