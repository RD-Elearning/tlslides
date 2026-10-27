/**
 * spro creative CR10 — choreography, transitions and personality: the move orders the reveal and
 * picks the leading preset (authored motion wins), a transition is validated, round-tripped and
 * planned (cut under reduced motion), and a personality scales the timing.
 */
import { choreoOrder, choreoPreset } from './choreo'
import { transitionPlan } from './transition'
import { personalityOf, personalTiming } from './personality'
import { deckSpecToDocument } from '../deck-document'
import { documentToDeckSpec } from '../slide-decompiler'
import { validateDeckSpec } from '../validate-deck-spec'
import { deckSpecJsonSchema } from '../deck-spec-json-schema'
import type { BlockSpec, DeckSpec, SlideSpec } from '../types'

const B = (id: string, type: string, props: Record<string, unknown> = {}): BlockSpec => ({ id, type, props })

describe('choreography (CR10)', () => {
  it('a move leads with its blocks, then the title, then reading order', () => {
    const blocks = [B('t', 'tls.t.title'), B('n', 'tls.t.bullets'), B('s', 'tls.c.stat-hero'), B('c', 'tls.t.paragraph')]
    expect(choreoOrder('big-number', blocks)).toEqual([2, 0, 1, 3])
    expect(choreoOrder(undefined, blocks)).toEqual([0, 1, 2, 3])
    expect(choreoOrder('statement-poster', [B('x', 'tls.t.paragraph'), B('q', 'tls.t.statement')])).toEqual([1, 0])
    expect(choreoPreset('statement-poster', B('q', 'tls.t.statement'), () => true)).toBe('words-in')
    expect(choreoPreset('statement-poster', B('x', 'tls.t.paragraph'), () => true)).toBeUndefined()
    expect(choreoPreset('versus', B('v', 'tls.c.comparison'), () => false)).toBeUndefined()
  })

  it('the compiler orders a choreographed slide, and authored motion is left alone', () => {
    const slide: SlideSpec = {
      id: 's', layout: 'blank', choreography: 'statement-poster',
      regions: { content: [B('t', 'tls.t.title', { text: 'Why trees?' }), B('p', 'tls.t.body', { text: 'Because search is log n.' }), B('q', 'tls.t.statement', { text: 'Order makes search fast.' }), { ...B('m', 'tls.t.body', { text: 'mine' }), motion: { preset: 'fade', order: 9 } }] },
    }
    const { document } = deckSpecToDocument({ version: 1, id: 'd', title: 'd', theme: 'mono-grid', aspect: 'widescreen', slides: [slide] } as DeckSpec)
    const shapes = Object.values(document.pages.s.shapes) as Array<{ animation?: { order: number }; props: Record<string, any> }>
    const order = (id: string) => shapes.find((x) => x.props.$block?.id === id)?.animation?.order
    expect(order('q')).toBe(0)
    expect(order('t')).toBe(1)
    expect(order('p')).toBe(2)
    expect(order('m')).toBe(9)
  })
})

describe('transitions and personality (CR10)', () => {
  const deck = (slide: Partial<SlideSpec>, over: Partial<DeckSpec> = {}): DeckSpec =>
    ({ version: 1, id: 'd', title: 'd', theme: 'doodle-paper', style: 'doodle', aspect: 'widescreen', slides: [{ id: 's', layout: 'blank', regions: { content: [B('t', 'tls.t.title', { text: 'Hi' })] }, ...slide }], ...over }) as DeckSpec

  it('validates, round-trips and schemas transition, choreography and personality', () => {
    const d = deck({ transition: { kind: 'push', dir: 'left' }, choreography: 'diagram-hero' }, { motionPersonality: 'lively' })
    expect(validateDeckSpec(d).filter((f) => f.rule.startsWith('motion/'))).toEqual([])
    const back = documentToDeckSpec(deckSpecToDocument(d).document).spec
    expect(back.slides[0].transition).toEqual({ kind: 'push', dir: 'left' })
    expect(back.slides[0].choreography).toBe('diagram-hero')
    expect(back.motionPersonality).toBe('lively')
    const bad = deck({ transition: { kind: 'spin' } as never }, { motionPersonality: 'wild' as never })
    expect(validateDeckSpec(bad).map((f) => f.rule)).toEqual(expect.arrayContaining(['motion/unknown-transition', 'motion/unknown-personality']))
    const schema = deckSpecJsonSchema() as any
    expect(schema.properties.motionPersonality.enum).toEqual(['calm', 'lively', 'cinematic'])
    expect(schema.properties.slides.items.properties.transition.properties.kind.enum).toContain('wipe')
  })

  it('plans each kind, cuts under reduced motion, and scales with the personality', () => {
    expect(transitionPlan({ kind: 'none' })).toBeUndefined()
    expect(transitionPlan({ kind: 'fade' }, undefined, true)).toBeUndefined()
    expect(transitionPlan({ kind: 'push', dir: 'left' })!.keyframes[0]).toEqual({ translate: '-100% 0' })
    expect(transitionPlan({ kind: 'wipe', dir: 'up' })!.keyframes[0]).toEqual({ clipPath: 'inset(100% 0% 0% 0%)' })
    expect(transitionPlan({ kind: 'flip' })!.keyframes[0]).toEqual({ opacity: 0 })
    expect(transitionPlan({ kind: 'fade' }, 'cinematic')!.durationMs).toBeGreaterThan(transitionPlan({ kind: 'fade' })!.durationMs)
    const t = { durationMs: 400, staggerMs: 50, easing: 'ease' }
    expect(personalTiming(t, undefined)).toBe(t)
    expect(personalTiming(t, 'calm')).toMatchObject({ durationMs: 480, staggerMs: 30 })
    expect(personalTiming(t, 'lively').easing).toBe(personalityOf('lively').ease)
  })
})
