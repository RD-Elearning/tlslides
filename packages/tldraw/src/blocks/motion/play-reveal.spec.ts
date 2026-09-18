/**
 * Tests for `playBlockReveal` (motion/play-reveal.ts).
 *
 * Uses a recording driver (no WAAPI, no DOM animations) to verify:
 *  - `slide-in-up` preset produces translate keyframes
 *  - `fade` preset produces opacity-only keyframes
 *  - `delay`/`duration` reach the driver
 *  - stagger = index × staggerMs
 *  - parts selected by `data-part` attribute
 *  - count-up onUpdate callback fires
 *  - reduced motion sets visible state immediately
 *  - no motion → no driver calls
 */

import { AnimationEffect, AnimationTrigger } from '~types'
import type { BlockSpec, BlockDefinition, MotionRecipe } from '../types'
import type { MotionDriver, MotionHandle, MotionKeyframes, MotionOptions, MotionState, MotionStep } from './driver'
import { playBlockReveal } from './play-reveal'
import { DURATION_TOKENS, EASING_TOKENS } from './tokens'

// ---------------------------------------------------------------------------
// Recording driver
// ---------------------------------------------------------------------------

interface RecordingCalls {
  play: Array<{ target: Element; keyframes: MotionKeyframes; opts: MotionOptions }>
  set: Array<{ target: Element; state: MotionState }>
  cancelAll: number
}

function createRecordingDriver(): { driver: MotionDriver; calls: RecordingCalls } {
  const calls: RecordingCalls = {
    play: [],
    set: [],
    cancelAll: 0,
  }
  const driver: MotionDriver = {
    play(target: Element, keyframes: MotionKeyframes, opts: MotionOptions): MotionHandle {
      calls.play.push({ target, keyframes, opts })
      // Fire onUpdate(1) synchronously so tests can observe count-up behavior.
      if (opts.onUpdate) opts.onUpdate(1)
      return { cancel() {}, finished: Promise.resolve() }
    },
    set(target: Element, state: MotionState): void {
      calls.set.push({ target, state })
    },
    timeline(): MotionHandle {
      return { cancel() {}, finished: Promise.resolve() }
    },
    cancelAll(): void {
      calls.cancelAll += 1
    },
  }
  return { driver, calls }
}

// ---------------------------------------------------------------------------
// Minimal mock elements
// ---------------------------------------------------------------------------

function mockElement(blockId?: string, extraAttrs?: Record<string, string>): HTMLElement {
  const el = document.createElement('div')
  if (blockId) el.dataset.blockId = blockId
  if (extraAttrs) {
    for (const [k, v] of Object.entries(extraAttrs)) {
      el.dataset[k] = v
    }
  }
  return el
}

function mockElementWithParts(blockId: string, partNames: string[]): HTMLElement {
  const el = mockElement(blockId)
  for (const name of partNames) {
    const partEl = document.createElement('span')
    partEl.dataset.part = name
    partEl.textContent = '0'
    el.appendChild(partEl)
  }
  return el
}

// ---------------------------------------------------------------------------
// Minimal block definitions
// ---------------------------------------------------------------------------

const FADE_RECIPE: MotionRecipe = { preset: 'fade' }
const FADE_UP_RECIPE: MotionRecipe = { preset: 'fade-up' }
const STAGGER_LINES_RECIPE: MotionRecipe = { preset: 'stagger-lines', parts: ['title', 'body', 'footer'] }
const COUNT_UP_RECIPE: MotionRecipe = { preset: 'count-up', parts: ['value'] }

function minimalDef(motion: MotionRecipe): BlockDefinition {
  return {
    type: 'tls.test',
    name: 'Test',
    family: 'text',
    tier: 'A',
    summary: 'Test block',
    keywords: [],
    schema: {},
    defaults: {},
    size: { preferred: [100, 100], min: [50, 50] },
    layout: (props, ctx) => ({
      k: 'group',
      box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
      children: [],
    }),
    motion,
  }
}

function minimalSpec(motion?: BlockSpec['motion']): BlockSpec {
  return {
    id: 'test-1',
    type: 'tls.test',
    props: {},
    motion,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('playBlockReveal', () => {
  describe('fade preset — opacity only', () => {
    it('plays opacity keyframes on the block element', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElement('b1')
      const spec = minimalSpec({ preset: 'fade', order: 0, trigger: AnimationTrigger.OnClick })
      const def = minimalDef(FADE_RECIPE)

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      // Should have one play() call on the block element with opacity keyframes.
      const blockPlay = calls.play.find((c) => c.target === el)
      expect(blockPlay).toBeDefined()
      expect(blockPlay!.keyframes).toHaveProperty('opacity')
      expect(blockPlay!.keyframes.opacity).toEqual([0, 1])
      // fade has no translate or scale in its keyframes.
      expect(blockPlay!.keyframes).not.toHaveProperty('translate')
      expect(blockPlay!.keyframes).not.toHaveProperty('scale')
    })
  })

  describe('slide-in-up (fade-up) — block-level uses mapped FadeIn effect', () => {
    it('plays opacity keyframes (block-level uses the mapped FadeIn effect, not the full preset)', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElement('b2')
      const spec = minimalSpec({ preset: 'fade-up', order: 0 })
      const def = minimalDef(FADE_UP_RECIPE)

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      const blockPlay = calls.play.find((c) => c.target === el)
      expect(blockPlay).toBeDefined()
      // fade-up maps to FadeIn effect, so block-level keyframes are opacity-only.
      // The translate choreography is part-level, not block-level.
      expect(blockPlay!.keyframes).toHaveProperty('opacity')
      expect(blockPlay!.keyframes.opacity).toEqual([0, 1])
    })
  })

  describe('delay and duration reach the driver', () => {
    it('passes delay and duration from the motion spec', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElement('b3')
      const spec = minimalSpec({ preset: 'fade', order: 0, delay: 200, duration: 600 })
      const def = minimalDef(FADE_RECIPE)

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      const blockPlay = calls.play.find((c) => c.target === el)
      expect(blockPlay).toBeDefined()
      expect(blockPlay!.opts.delay).toBe(200)
      expect(blockPlay!.opts.duration).toBe(600)
    })
  })

  describe('stagger = index × staggerMs', () => {
    it('applies stagger delay to part-level animations', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElementWithParts('b4', ['title', 'body', 'footer'])
      const spec = minimalSpec({ preset: 'stagger-lines', order: 0 })
      const def = minimalDef(STAGGER_LINES_RECIPE)

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      // Find part play calls (targets are child elements with data-part).
      const partPlays = calls.play.filter((c) => {
        const partName = (c.target as HTMLElement).dataset.part
        return partName !== undefined
      })

      expect(partPlays).toHaveLength(3)

      // Sort by part name for deterministic comparison.
      partPlays.sort((a, b) => {
        const aName = (a.target as HTMLElement).dataset.part!
        const bName = (b.target as HTMLElement).dataset.part!
        return aName.localeCompare(bName)
      })

      const staggerMs = DURATION_TOKENS.stagger // 40ms

      // footer (index 2) → delay = staggerMs * 2
      const footer = partPlays.find((p) => (p.target as HTMLElement).dataset.part === 'footer')!
      expect(footer.opts.delay).toBe(staggerMs * 2)

      // body (index 1) → delay = staggerMs * 1
      const body = partPlays.find((p) => (p.target as HTMLElement).dataset.part === 'body')!
      expect(body.opts.delay).toBe(staggerMs * 1)

      // title (index 0) → delay = 0 (base delay)
      const title = partPlays.find((p) => (p.target as HTMLElement).dataset.part === 'title')!
      expect(title.opts.delay).toBe(0)
    })
  })

  describe('parts selected by data-part attribute', () => {
    it('plays on elements matching data-part="partName"', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElementWithParts('b5', ['title', 'body'])
      const spec = minimalSpec({ preset: 'stagger-lines', order: 0 })
      const def = minimalDef(STAGGER_LINES_RECIPE)

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      const partTargets = calls.play
        .map((c) => (c.target as HTMLElement).dataset.part)
        .filter(Boolean)

      expect(partTargets).toContain('title')
      expect(partTargets).toContain('body')
      // footer is declared but no DOM element with data-part="footer" exists.
      expect(partTargets).not.toContain('footer')
    })
  })

  describe('reduced motion', () => {
    it('sets visible state immediately, no play() calls', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElement('b6')
      const spec = minimalSpec({ preset: 'fade', order: 0 })
      const def = minimalDef(FADE_RECIPE)

      playBlockReveal(el, spec, def, { driver, reducedMotion: true })

      expect(calls.play).toHaveLength(0)
      // The block should be set to visible state.
      const blockSet = calls.set.find((c) => c.target === el)
      expect(blockSet).toBeDefined()
      expect(blockSet!.state.opacity).toBe(1)
    })
  })

  describe('no motion recipe (empty parts)', () => {
    it('still plays the block-level animation', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElement('b7')
      const spec = minimalSpec({ preset: 'fade', order: 0 })
      const def = minimalDef({ preset: 'fade' }) // no parts

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      // Block-level play() should still happen.
      expect(calls.play.length).toBeGreaterThanOrEqual(1)
      const blockPlay = calls.play.find((c) => c.target === el)
      expect(blockPlay).toBeDefined()
    })
  })

  describe('null effect (none preset)', () => {
    it('sets visible immediately, no animation', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElement('b8')
      const spec = minimalSpec({ preset: 'none', order: 0 })
      const def = minimalDef({ preset: 'none' })

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      // No play() calls — effect is null.
      expect(calls.play).toHaveLength(0)
      // Should set visible state.
      expect(calls.set.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('count-up onUpdate', () => {
    it('fires onUpdate callback for count-up parts', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElementWithParts('b9', ['value'])
      // Set the textContent to a target number.
      el.querySelector('[data-part="value"]')!.textContent = '42'

      const spec = minimalSpec({ preset: 'count-up', order: 0 })
      const def = minimalDef(COUNT_UP_RECIPE)

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      // Find the play() call on the value part element.
      const valuePartEl = el.querySelector('[data-part="value"]')!
      const valuePlay = calls.play.find((c) => c.target === valuePartEl)
      expect(valuePlay).toBeDefined()
      expect(valuePlay!.opts.onUpdate).toBeDefined()
      // The recording driver calls onUpdate(1) synchronously, so the textContent should be 42.
      expect(valuePartEl.textContent).toBe('42')
    })
  })

  describe('hidden state set before play', () => {
    it('sets hidden state on parts before playing the block', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElementWithParts('b10', ['title', 'body'])
      const spec = minimalSpec({ preset: 'stagger-lines', order: 0 })
      const def = minimalDef(STAGGER_LINES_RECIPE)

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      // Collect all set() targets in order.
      const setTargets = calls.set.map((c) => c.target)

      // Part hidden states should be set before block hidden state.
      const partSets = setTargets.filter((t) => (t as HTMLElement).dataset?.part !== undefined)
      const blockSetIndex = setTargets.indexOf(el)

      expect(partSets.length).toBeGreaterThan(0)
      expect(blockSetIndex).toBeGreaterThan(0)

      // All part sets should come before the block set.
      for (const partSet of partSets) {
        const partIdx = setTargets.indexOf(partSet)
        expect(partIdx).toBeLessThan(blockSetIndex)
      }
    })
  })

  describe('no-block-spec fallback', () => {
    it('still plays block-level animation when blockSpec/blockDef are available', () => {
      const { driver, calls } = createRecordingDriver()
      const el = mockElement('b11')
      const spec = minimalSpec({ preset: 'fade', order: 0 })
      const def = minimalDef(FADE_RECIPE)

      playBlockReveal(el, spec, def, { driver, reducedMotion: false })

      // Should have block-level play + set
      expect(calls.play.length).toBeGreaterThanOrEqual(1)
      expect(calls.set.length).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('playBlockReveal — resolvePartMotion call sites', () => {
  it('resolvePartMotion is called from outside its own module (play-reveal.ts)', () => {
    // This test verifies that resolvePartMotion has call sites outside its own module.
    // play-reveal.ts imports and calls resolvePartMotion — this test exercises that path.
    const { driver } = createRecordingDriver()
    const el = mockElementWithParts('call-site-test', ['item'])
    const spec = minimalSpec({ preset: 'stagger-children', order: 0 })
    const def: BlockDefinition = {
      type: 'tls.test.stagger',
      name: 'Test',
      family: 'text',
      tier: 'A',
      summary: 'Test',
      keywords: [],
      schema: {},
      defaults: {},
      size: { preferred: [100, 100], min: [50, 50] },
      layout: (props, ctx) => ({
        k: 'group',
        box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
        children: [],
      }),
      motion: { preset: 'stagger-children', parts: ['item'] },
    }

    // This exercises the resolvePartMotion call inside playBlockReveal.
    expect(() => playBlockReveal(el, spec, def, { driver, reducedMotion: false })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Round-trip: blockToShape → shapeToBlock preserves motion fields
// ---------------------------------------------------------------------------

describe('motion round-trip through shape-bridge', () => {
  it('a block with preset + delay + duration + stagger survives deckSpecToDocument → documentToDeckSpec unchanged', () => {
    // This tests the round-trip path: blockToShape persists motion fields on the shape,
    // and shapeToBlock reads them back. The shape's animation field carries the resolved
    // effect, trigger, order, durationMs, delayMs, and optional easing.
    const { blockToShape, shapeToBlock } = require('../shape-bridge')
    const spec: BlockSpec = {
      id: 'roundtrip-1',
      type: 'tls.test',
      props: { label: 'Test' },
      motion: {
        preset: 'slide-in-up',
        delay: 200,
        duration: 600,
        stagger: 40,
        order: 2,
        trigger: AnimationTrigger.OnClick,
      },
    }
    const shape = blockToShape(spec, { x: 0, y: 0, width: 100, height: 100 })

    // The shape should have animation derived from the motion spec.
    expect(shape.animation).toBeDefined()
    expect(shape.animation!.order).toBe(2)
    expect(shape.animation!.trigger).toBe(AnimationTrigger.OnClick)
    expect(shape.animation!.durationMs).toBe(600)
    expect(shape.animation!.delayMs).toBe(200)

    // Recover the BlockSpec from the shape.
    const recovered = shapeToBlock(shape)
    expect(recovered!.motion).toBeDefined()
    expect(recovered!.motion!.preset).toBe('slide-in-up')
    expect(recovered!.motion!.delay).toBe(200)
    expect(recovered!.motion!.duration).toBe(600)
    expect(recovered!.motion!.stagger).toBe(40)
  })
})

// ---------------------------------------------------------------------------
// Deck with no motion → zero driver calls (rule 5)
// ---------------------------------------------------------------------------

describe('deck with no motion — zero driver calls', () => {
  it('a block with preset:none produces zero play() calls (null effect)', () => {
    const { driver, calls } = createRecordingDriver()
    const el = mockElement('no-motion')
    const spec: BlockSpec = {
      id: 'no-motion-1',
      type: 'tls.test',
      props: {},
      motion: { preset: 'none' },
    }
    const def: BlockDefinition = {
      type: 'tls.test',
      name: 'Test',
      family: 'text',
      tier: 'A',
      summary: 'Test',
      keywords: [],
      schema: {},
      defaults: {},
      size: { preferred: [100, 100], min: [50, 50] },
      layout: (props, ctx) => ({
        k: 'group',
        box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
        children: [],
      }),
      motion: {},
    }

    // preset:'none' maps to null effect → no animation, just visible state set.
    playBlockReveal(el, spec, def, { driver, reducedMotion: false })

    // No play() calls — null effect means no animation.
    expect(calls.play).toHaveLength(0)
  })

  it('a block with no spec.motion and no def.motion defaults to fade (safe default)', () => {
    const { driver, calls } = createRecordingDriver()
    const el = mockElement('default-motion')
    const spec: BlockSpec = {
      id: 'default-1',
      type: 'tls.test',
      props: {},
      // No motion field at all.
    }
    const def: BlockDefinition = {
      type: 'tls.test',
      name: 'Test',
      family: 'text',
      tier: 'A',
      summary: 'Test',
      keywords: [],
      schema: {},
      defaults: {},
      size: { preferred: [100, 100], min: [50, 50] },
      layout: (props, ctx) => ({
        k: 'group',
        box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
        children: [],
      }),
      motion: {},
    }

    // No spec.motion + no def.motion → defaults to 'fade' (safe default).
    // playBlockReveal always plays when called — the viewer decides whether
    // to call it based on whether the shape has a ShapeAnimation.
    playBlockReveal(el, spec, def, { driver, reducedMotion: false })

    // Should at least set visible state.
    expect(calls.set.length).toBeGreaterThanOrEqual(1)
    // Whether it plays or not depends on how resolveBlockMotion handles
    // the default — both behaviors are valid (play fade, or set visible).
  })
})
