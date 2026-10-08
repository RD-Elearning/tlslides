/**
 * P7 — motion styles: resolver, compiler integration, precedence, back-compat, round trip,
 * validator, and indexed part matching in `playBlockReveal`.
 */

import { AnimationEffect, AnimationTrigger } from '~types'
import type { ComponentShape } from '~types'
import type { BlockSpec, DeckSpec, MotionRecipe, SlideSpec } from '../types'
import { BlockRegistry } from '../registry'
import { registerBuiltInBlocks } from '../library'
import { compileSlide } from '../slide-compiler'
import { resolveTokens } from '../tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { deckSpecToDocument } from '../deck-document'
import { documentToDeckSpec } from '../slide-decompiler'
import { revealStyleOf, shapeToBlock, shapeToRevealBlock } from '../shape-bridge'
import { validateDeckSpec } from '../validate-deck-spec'
import { deckSpecJsonSchema } from '../deck-spec-json-schema'
import { capabilityIndex } from '../capability-digest'
import { computeBuildSteps } from '~state/deck/presentation'
import {
  effectiveMotionStyle,
  isMotionStyle,
  readingOrder,
  styleBlockMotion,
  SUBTLE_OFFSET_CAP_MS,
  SUBTLE_OFFSET_MS,
} from './motion-style'
import { partElements, playBlockReveal } from './play-reveal'
import { resolvePartMotion } from './resolve-motion'
import type { MotionDriver, MotionKeyframes, MotionOptions } from './driver'
import demoDeck from '../__fixtures__/demo-deck.json'

const FRAME = { width: 1920, height: 1080 }
const TOKENS = resolveTokens(DEFAULT_DECK_THEME)

function registry(): BlockRegistry {
  const r = new BlockRegistry()
  registerBuiltInBlocks(r)
  return r
}

/** Title + chart (left) + bullets (right); no block carries its own motion. */
function slide(extra: Partial<SlideSpec> = {}, blockMotion?: Record<string, BlockSpec['motion']>): SlideSpec {
  const b = (id: string, type: string, props: Record<string, unknown>): BlockSpec => ({
    id,
    type,
    props,
    ...(blockMotion?.[id] !== undefined ? { motion: blockMotion[id] } : {}),
  })
  return {
    id: 's1',
    layout: 'two-column',
    regions: {
      // Deliberately out of reading order in JSON: the compiler must sort by position.
      right: [b('bullets', 'tls.t.bullets', { items: [{ text: 'One' }, { text: 'Two' }, { text: 'Three' }] })],
      left: [b('bar', 'tls.d.bar', { categories: ['A', 'B', 'C'], series: [3, 5, 4] })],
      title: [b('title', 'tls.t.title', { text: 'Margin by quarter' })],
    },
    ...extra,
  }
}

function byBlockId(shapes: ComponentShape[]): Record<string, ComponentShape> {
  const out: Record<string, ComponentShape> = {}
  for (const s of shapes) out[(s.props as any).$block.id] = s
  return out
}

/** Shapes with the random shape id removed, for structural comparison. */
function stable(shapes: ComponentShape[]): unknown[] {
  return shapes.map(({ id: _id, ...rest }) => rest)
}

describe('styleBlockMotion (resolver)', () => {
  const recipe: MotionRecipe = { parts: ['bar'], preset: 'grow-bars-y' }

  it('static and absent give no motion', () => {
    expect(styleBlockMotion('static', recipe, 0)).toBeUndefined()
    expect(styleBlockMotion(undefined, recipe, 0)).toBeUndefined()
  })

  it('subtle is a fade, all with previous, small capped offset', () => {
    const m0 = styleBlockMotion('subtle', recipe, 0)!
    expect(m0).toEqual({ preset: 'fade', trigger: AnimationTrigger.WithPrevious, order: 0, delay: 0 })
    expect(styleBlockMotion('subtle', recipe, 2)!.delay).toBe(2 * SUBTLE_OFFSET_MS)
    expect(styleBlockMotion('subtle', recipe, 99)!.delay).toBe(SUBTLE_OFFSET_CAP_MS)
  })

  it('expressive uses recipe.expressive, then preset, then fade-up; chains after the first', () => {
    expect(styleBlockMotion('expressive', { ...recipe, expressive: 'pop' }, 0)!.preset).toBe('pop')
    expect(styleBlockMotion('expressive', recipe, 0)!.preset).toBe('grow-bars-y')
    expect(styleBlockMotion('expressive', {}, 0)!.preset).toBe('fade-up')
    expect(styleBlockMotion('expressive', { expressive: 'not-a-preset' }, 0)!.preset).toBe('fade-up')
    expect(styleBlockMotion('expressive', recipe, 0)!.trigger).toBe(AnimationTrigger.WithPrevious)
    const m1 = styleBlockMotion('expressive', recipe, 1)!
    expect(m1.trigger).toBe(AnimationTrigger.AfterPrevious)
    expect(m1.order).toBe(1)
  })

  it('expressive takes expressiveMs as the duration (html timelines)', () => {
    expect(styleBlockMotion('expressive', { expressiveMs: 2400 }, 0)!.duration).toBe(2400)
    expect(styleBlockMotion('expressive', {}, 0)!.duration).toBeUndefined()
  })

  it('a recipe with preset none (chrome) is never animated by a style', () => {
    expect(styleBlockMotion('subtle', { preset: 'none' }, 0)).toBeUndefined()
    expect(styleBlockMotion('expressive', { preset: 'none' }, 0)).toBeUndefined()
  })

  it('slide style wins over deck style; unknown values are ignored', () => {
    expect(effectiveMotionStyle('subtle', 'expressive')).toBe('subtle')
    expect(effectiveMotionStyle(undefined, 'expressive')).toBe('expressive')
    expect(effectiveMotionStyle('wild', 'static')).toBe('static')
    expect(effectiveMotionStyle(undefined, undefined)).toBeUndefined()
    expect(isMotionStyle('expressive')).toBe(true)
    expect(isMotionStyle('Expressive')).toBe(false)
  })

  it('reading order is rows first, then left to right', () => {
    const boxes = [
      { x: 1000, y: 300 },
      { x: 100, y: 310 },
      { x: 100, y: 80 },
    ]
    expect([...boxes].sort(readingOrder)).toEqual([boxes[2], boxes[1], boxes[0]])
  })
})

describe('compileSlide with motionStyle', () => {
  const reg = registry()

  it('back-compat: no style anywhere compiles to exactly the pre-P7 output', () => {
    const plain = compileSlide(slide(), FRAME, TOKENS, reg)
    const withEmptyOpts = compileSlide(slide(), FRAME, TOKENS, reg, {})
    expect(stable(withEmptyOpts.shapes)).toEqual(stable(plain.shapes))
    for (const s of plain.shapes) {
      expect(s.animation).toBeUndefined()
      expect((s.props as any).$block.styleMotion).toBeUndefined()
      expect((s.props as any).$block.motionStyle).toBeUndefined()
    }
  })

  it('back-compat: the demo deck compiles identically with and without an empty options bag', () => {
    for (const sl of (demoDeck as unknown as DeckSpec).slides) {
      const a = compileSlide(sl, FRAME, TOKENS, reg)
      const b = compileSlide(sl, FRAME, TOKENS, reg, { motionStyle: undefined })
      expect(stable(b.shapes)).toEqual(stable(a.shapes))
    }
  })

  it('static: nothing animates', () => {
    const { shapes } = compileSlide(slide({ motionStyle: 'static' }), FRAME, TOKENS, reg)
    expect(shapes.every((s) => s.animation === undefined)).toBe(true)
  })

  it('subtle: one auto step of fades with a reading-order offset', () => {
    const { shapes } = compileSlide(slide({ motionStyle: 'subtle' }), FRAME, TOKENS, reg)
    const m = byBlockId(shapes)
    for (const s of shapes) {
      expect(s.animation!.effect).toBe(AnimationEffect.FadeIn)
      expect(s.animation!.trigger).toBe(AnimationTrigger.WithPrevious)
      expect(s.animation!.durationMs).toBe(250)
      expect((s.props as any).$block.motionStyle).toBe('subtle')
    }
    // title (top) first, then left (bar), then right (bullets)
    expect(m.title.animation!.delayMs).toBe(0)
    expect(m.bar.animation!.delayMs).toBe(SUBTLE_OFFSET_MS)
    expect(m.bullets.animation!.delayMs).toBe(2 * SUBTLE_OFFSET_MS)
    const steps = computeBuildSteps({ id: 'p', name: 'p', childIndex: 1, shapes: m as any, bindings: {} })
    expect(steps).toHaveLength(1)
    expect(steps[0].auto).toBe(true)
  })

  it('expressive: recipe presets, chained in reading order with no clicks', () => {
    const { shapes } = compileSlide(slide({ motionStyle: 'expressive' }), FRAME, TOKENS, reg)
    const m = byBlockId(shapes)
    // RVM3: the bar chart's expressive recipe is `stagger-children` with its bars growing from the
    // zero line as a part preset (`grow-bars-y`), its title and value labels fading around them
    expect((m.bar.props as any).$block.styleMotion.preset).toBe('stagger-children')
    const barParts = resolvePartMotion((m.bar.props as any).$block.styleMotion, reg.get('tls.d.bar')!.motion)
    expect(barParts.find((p) => p.partName === 'bar[*][*]')!.presetId).toBe('grow-bars-y')
    expect(m.bar.animation!.effect).toBe(AnimationEffect.FadeIn)
    expect(m.title.animation!.order).toBe(0)
    expect(m.bar.animation!.order).toBe(1)
    expect(m.bullets.animation!.order).toBe(2)
    expect(m.title.animation!.trigger).toBe(AnimationTrigger.WithPrevious)
    expect(m.bar.animation!.trigger).toBe(AnimationTrigger.AfterPrevious)
    const steps = computeBuildSteps({ id: 'p', name: 'p', childIndex: 1, shapes: m as any, bindings: {} })
    expect(steps).toHaveLength(3)
    expect(steps.every((s) => s.auto)).toBe(true)
    expect(steps.map((s) => s.shapeIds[0])).toEqual([m.title.id, m.bar.id, m.bullets.id])
  })

  it('deck style applies through opts; the slide style overrides it', () => {
    const viaDeck = compileSlide(slide(), FRAME, TOKENS, reg, { motionStyle: 'subtle' })
    expect(viaDeck.shapes.every((s) => s.animation?.effect === AnimationEffect.FadeIn)).toBe(true)
    const slideWins = compileSlide(slide({ motionStyle: 'static' }), FRAME, TOKENS, reg, { motionStyle: 'expressive' })
    expect(slideWins.shapes.every((s) => s.animation === undefined)).toBe(true)
  })

  it('an explicit block motion wins over the style; preset none opts a block out', () => {
    const { shapes } = compileSlide(
      slide({ motionStyle: 'expressive' }, { bar: { preset: 'pop', order: 7, trigger: AnimationTrigger.OnClick }, bullets: { preset: 'none' } }),
      FRAME,
      TOKENS,
      reg
    )
    const m = byBlockId(shapes)
    expect(m.bar.animation!.order).toBe(7)
    expect(m.bar.animation!.trigger).toBe(AnimationTrigger.OnClick)
    expect((m.bar.props as any).$block.styleMotion).toBeUndefined()
    expect(m.bullets.animation).toBeUndefined()
    // only the title is styled, so it is index 0
    expect(m.title.animation!.order).toBe(0)
  })
})

describe('shape bridge and round trip', () => {
  const reg = registry()

  it('style-derived motion is not returned as authored motion', () => {
    const { shapes } = compileSlide(slide({ motionStyle: 'expressive' }), FRAME, TOKENS, reg)
    for (const s of shapes) {
      const spec = shapeToBlock(s)!
      expect(spec.motion).toBeUndefined()
      expect(spec.props.$block).toBeUndefined()
      const reveal = shapeToRevealBlock(s)!
      expect(reveal.motion).toEqual((s.props as any).$block.styleMotion)
      expect(revealStyleOf(s)).toBe('expressive')
    }
  })

  it('revealStyleOf is subtle only for subtle-derived motion', () => {
    const sub = compileSlide(slide({ motionStyle: 'subtle' }), FRAME, TOKENS, reg).shapes
    expect(sub.every((s) => revealStyleOf(s) === 'subtle')).toBe(true)
    const plain = compileSlide(slide(), FRAME, TOKENS, reg).shapes
    expect(plain.every((s) => revealStyleOf(s) === 'expressive')).toBe(true)
  })

  it('deck and slide motionStyle survive deckSpecToDocument -> documentToDeckSpec', () => {
    const deck: DeckSpec = {
      version: 1,
      id: 'd',
      title: 'T',
      theme: 'mono-grid',
      aspect: 'widescreen',
      motionStyle: 'subtle',
      slides: [slide({ id: 'a', motionStyle: 'expressive' }), slide({ id: 'b' })],
    }
    const { document } = deckSpecToDocument(deck)
    expect(document.motionStyle).toBe('subtle')
    expect(document.pages.a.motionStyle).toBe('expressive')
    expect(document.pages.b.motionStyle).toBeUndefined()
    const back = documentToDeckSpec(document).spec
    expect(back.motionStyle).toBe('subtle')
    expect(back.slides[0].motionStyle).toBe('expressive')
    expect('motionStyle' in back.slides[1]).toBe(false)
    for (const s of back.slides) {
      for (const blocks of Object.values(s.regions)) for (const b of blocks) expect(b.motion).toBeUndefined()
    }
  })

  it('a deck without motionStyle carries no motionStyle key through the round trip', () => {
    const { document } = deckSpecToDocument(demoDeck as unknown as DeckSpec)
    expect('motionStyle' in document).toBe(false)
    const back = documentToDeckSpec(document).spec
    expect('motionStyle' in back).toBe(false)
  })
})

describe('validator, JSON schema, digest', () => {
  const base = (): DeckSpec => ({ version: 1, id: 'd', title: 'T', theme: 'mono-grid', aspect: 'widescreen', slides: [slide()] })

  it('accepts every valid style on deck and slide with no finding', () => {
    for (const st of ['static', 'subtle', 'expressive'] as const) {
      const d = { ...base(), motionStyle: st, slides: [slide({ motionStyle: st })] }
      expect(validateDeckSpec(d).filter((f) => f.rule === 'motion/unknown-style')).toEqual([])
    }
  })

  it('warns motion/unknown-style with a suggestion on deck and slide', () => {
    const d = { ...base(), motionStyle: 'expresive', slides: [slide({ motionStyle: 'loud' as any })] } as any
    const f = validateDeckSpec(d).filter((x) => x.rule === 'motion/unknown-style')
    expect(f).toHaveLength(2)
    expect(f.every((x) => x.level === 'warning')).toBe(true)
    expect(f[0].path).toBe('motionStyle')
    expect(f[0].suggestion).toBe('expressive')
    expect(f[1].path).toBe('slides[0].motionStyle')
  })

  it('JSON schema lists the enum on deck and slide', () => {
    const schema = deckSpecJsonSchema() as any
    expect(schema.properties.motionStyle.enum).toEqual(['static', 'subtle', 'expressive'])
    expect(schema.properties.slides.items.properties.motionStyle.enum).toEqual(['static', 'subtle', 'expressive'])
  })

  it('the index tells the planner when to use each style', () => {
    const md = capabilityIndex()
    expect(md).toContain('`motionStyle`')
    expect(md).toContain('`expressive` for covers')
  })
})

describe('playBlockReveal — indexed part matching', () => {
  function recorder() {
    const plays: Array<{ target: Element; keyframes: MotionKeyframes; opts: MotionOptions }> = []
    const driver: MotionDriver = {
      play(target, keyframes, opts) {
        plays.push({ target, keyframes, opts })
        return { cancel() {}, finished: Promise.resolve() }
      },
      set() {},
      timeline() {
        return { cancel() {}, finished: Promise.resolve() }
      },
      cancelAll() {},
    }
    return { driver, plays }
  }

  function host(parts: string[]): HTMLElement {
    const el = document.createElement('div')
    for (const p of parts) {
      const c = document.createElement('div')
      c.setAttribute('data-part', p)
      el.appendChild(c)
    }
    return el
  }

  it('exact matches win and are not re-staggered', () => {
    const el = host(['bar', 'bar/0'])
    expect(partElements(el, 'bar')).toEqual({ els: [el.children[0]], indexed: false })
  })

  it('a family name matches its indexed parts; a glob matches item[i]', () => {
    const el = host(['bar/0', 'bar/1', 'barx', 'item[0].text', 'item[1].text', 'item[0].marker'])
    expect(partElements(el, 'bar').els.map((e) => e.getAttribute('data-part'))).toEqual(['bar/0', 'bar/1'])
    expect(partElements(el, 'item[*].text').els.map((e) => e.getAttribute('data-part'))).toEqual(['item[0].text', 'item[1].text'])
  })

  it('indexed elements stagger by the preset step', () => {
    const el = host(['bar/0', 'bar/1', 'bar/2'])
    const { driver, plays } = recorder()
    const spec: BlockSpec = { id: 'b', type: 'x', props: {}, motion: { preset: 'grow-bars-y' } }
    playBlockReveal(el, spec, { motion: { parts: ['bar'] } } as any, { driver, reducedMotion: false })
    const partPlays = plays.filter((p) => p.target !== el)
    expect(partPlays.map((p) => p.opts.delay)).toEqual([0, 40, 80])
  })
})

describe('P7 expressive recipes and count-up guard', () => {
  const reg = registry()

  it('existing blocks declare showy expressive presets that exist', () => {
    expect(reg.get('tls.t.title')!.motion.expressive).toBe('words-in')
    // RVM3: the tile fades in and its value counts up as a part preset (a block-level count-up
    // zoomed the whole tile in from 0.7 and counted the delta too)
    expect(reg.get('tls.c.kpi-tile')!.motion.expressive).toBe('stagger-children')
    expect(reg.get('tls.c.kpi-tile')!.motion.partMotion?.value?.preset).toBe('count-up')
    const { shapes } = compileSlide(slide({ motionStyle: 'expressive' }), FRAME, TOKENS, reg)
    expect((byBlockId(shapes).title.props as any).$block.styleMotion.preset).toBe('words-in')
  })

  it('count-up never rewrites text without a number and ends on the exact original text', () => {
    const el = document.createElement('div')
    for (const [part, text] of [['label', 'Adoption'], ['value', '1,250']]) {
      const c = document.createElement('div')
      c.setAttribute('data-part', part)
      c.textContent = text
      el.appendChild(c)
    }
    const driver: MotionDriver = {
      play(_t, _k, opts) {
        opts.onUpdate?.(0.5)
        opts.onUpdate?.(1)
        return { cancel() {}, finished: Promise.resolve() }
      },
      set() {},
      timeline() {
        return { cancel() {}, finished: Promise.resolve() }
      },
      cancelAll() {},
    }
    playBlockReveal(el, { id: 'k', type: 'x', props: {}, motion: { preset: 'count-up' } }, { motion: { parts: ['label', 'value'] } } as any, { driver, reducedMotion: false })
    expect(el.children[0].textContent).toBe('Adoption')
    expect(el.children[1].textContent).toBe('1,250')
  })

  it('count-up writes into a one-line text part\'s line, and never flattens a group part', () => {
    const el = document.createElement('div')
    el.innerHTML =
      '<div data-part="value"><div class="line">42%</div></div>' +
      '<div data-part="tile"><div>Label</div><div>17</div></div>'
    const seen: string[] = []
    const driver: MotionDriver = {
      play(_t, _k, opts) {
        opts.onUpdate?.(0.5)
        seen.push(el.innerHTML)
        opts.onUpdate?.(1)
        return { cancel() {}, finished: Promise.resolve() }
      },
      set() {},
      timeline() {
        return { cancel() {}, finished: Promise.resolve() }
      },
      cancelAll() {},
    }
    playBlockReveal(el, { id: 'k', type: 'x', props: {}, motion: { preset: 'count-up' } }, { motion: { parts: ['value', 'tile'] } } as any, { driver, reducedMotion: false })
    // M3: the count runs on tabular figures (no width jitter) and the last frame restores the line
    expect(seen.some((h) => h.includes('<div data-part="value" style="font-variant-numeric: tabular-nums;"><div class="line">21%</div>'))).toBe(true)
    expect(el.innerHTML).toBe('<div data-part="value" style=""><div class="line">42%</div></div><div data-part="tile" style=""><div>Label</div><div>17</div></div>'.replace(/ style=""/g, ''))
  })
})
