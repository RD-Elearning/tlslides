/**
 * V2 (spro vivid PLAN.md §4) — ambient loops: which loop a block plays (pure resolver), what the
 * DOM side starts, and the loop options of both drivers.
 */

import { AMBIENT_IDS, AMBIENT_PRESETS, SUBTLE_AMP, SUBTLE_PERIOD, ambientTargets, resolveAmbient, startAmbient } from './ambient'
import { ALLOWED_PROPERTIES, FORBIDDEN_PROPERTIES } from './driver'
import type { MotionDriver, MotionKeyframes, MotionOptions } from './driver'
import { createGsapDriver } from './gsap-driver'
import type { GsapInstance } from './gsap-driver'
import { createWAAPI_driver } from './waapi-driver'
import type { MotionRecipe } from '../types'
import { motion as imageMotion } from '../library/media/tls-m-image/motion'

const def = (ambient: MotionRecipe['ambient']) => ({ motion: { preset: 'fade', ambient } as MotionRecipe })

describe('resolveAmbient', () => {
  const block = { props: { shape: 'orb' } }

  it('no loop on a still slide, without a style, or under reduced motion', () => {
    const d = def({ preset: 'float' })
    expect(resolveAmbient(block, d, 'static')).toBeNull()
    expect(resolveAmbient(block, d, undefined)).toBeNull()
    expect(resolveAmbient(block, d, 'expressive', true)).toBeNull()
    expect(resolveAmbient(block, d, 'expressive')?.preset.id).toBe('float')
  })

  it('subtle: a smaller amplitude and a longer period', () => {
    const d = def({ preset: 'float' })
    const e = resolveAmbient(block, d, 'expressive')!
    const s = resolveAmbient(block, d, 'subtle')!
    expect(s.amp).toBeCloseTo(e.amp * SUBTLE_AMP)
    expect(s.periodMs).toBe(Math.round(e.periodMs * SUBTLE_PERIOD))
  })

  it('a recipe function decides from the props; the spec overrides it; none switches it off', () => {
    const d = def((p) => (p.shape === 'orb' ? { preset: 'float' } : null))
    expect(resolveAmbient(block, d, 'expressive')?.preset.id).toBe('float')
    expect(resolveAmbient({ props: { shape: 'frame' } }, d, 'expressive')).toBeNull()
    expect(resolveAmbient({ ...block, motion: { ambient: { preset: 'spin' } } }, d, 'expressive')?.preset.id).toBe('spin')
    expect(resolveAmbient({ ...block, motion: { ambient: { preset: 'none' } } }, d, 'expressive')).toBeNull()
    // an id the spec invents is ignored (the definition's loop plays)
    expect(resolveAmbient({ ...block, motion: { ambient: { preset: 'wobble' } } }, d, 'expressive')?.preset.id).toBe('float')
    // a definition without a loop: only an explicit spec loop plays
    expect(resolveAmbient(block, { motion: { preset: 'fade' } }, 'expressive')).toBeNull()
    expect(resolveAmbient({ ...block, motion: { ambient: { preset: 'bob', duration: 900 } } }, undefined, 'expressive')?.periodMs).toBe(900)
  })

  it('ken-burns: a spec that picks it zooms slowly, clipped; a backdrop photo zooms on its own', () => {
    const kb = resolveAmbient({ props: {}, motion: { preset: 'ken-burns' } }, undefined, 'expressive')!
    expect(kb.preset.id).toBe('zoom')
    expect(kb.clip).toBe(true)
    expect(resolveAmbient({ props: {}, motion: { preset: 'ken-burns' } }, undefined, 'static')).toBeNull()
    const image = { motion: imageMotion }
    expect(resolveAmbient({ props: { fit: 'cover' }, layer: 'backdrop' }, image, 'subtle')).toMatchObject({ part: 'image', clip: true })
    expect(resolveAmbient({ props: { fit: 'cover' } }, image, 'expressive')).toBeNull()
    expect(resolveAmbient({ props: { fit: 'contain' }, layer: 'backdrop' }, image, 'expressive')).toBeNull()
    expect(resolveAmbient({ props: { frame: 'polaroid' }, layer: 'backdrop' }, image, 'expressive')).toBeNull()
  })

  it('a part recipe keeps its part and stagger', () => {
    const r = resolveAmbient(block, def({ preset: 'bob', part: 'icon', stagger: 300 }), 'expressive')!
    expect(r.part).toBe('icon')
    expect(r.staggerMs).toBe(300)
  })
})

describe('ambient presets', () => {
  it('every loop uses the allowed vocabulary only, two values, and loops slowly', () => {
    const map: Record<string, string> = { translate: 'translate', rotate: 'rotate', scale: 'scale', opacity: 'opacity' }
    for (const id of AMBIENT_IDS) {
      const p = AMBIENT_PRESETS[id]
      const kf = p.keyframes(1) as Record<string, unknown[]>
      for (const [k, v] of Object.entries(kf)) {
        expect((ALLOWED_PROPERTIES as readonly string[]).includes(map[k])).toBe(true)
        expect(v).toHaveLength(2)
      }
      expect(p.periodMs).toBeGreaterThanOrEqual(1500)
    }
    expect(ALLOWED_PROPERTIES).toContain('rotate')
    expect(FORBIDDEN_PROPERTIES).toContain('transform')
  })

  it('amplitude scales the movement', () => {
    expect(AMBIENT_PRESETS.float.keyframes(0.5).translate![1]).toBe('0px -8px')
    expect(AMBIENT_PRESETS.sway.keyframes(1).rotate).toEqual(['-5deg', '5deg'])
  })
})

/** A driver that records `play` calls. */
function recordingDriver() {
  const calls: Array<{ target: Element; keyframes: MotionKeyframes; opts: MotionOptions; cancelled: boolean }> = []
  const driver: MotionDriver = {
    play(target, keyframes, opts) {
      const c = { target, keyframes, opts, cancelled: false }
      calls.push(c)
      return { cancel: () => void (c.cancelled = true), finished: new Promise<void>(() => undefined) }
    },
    set: jest.fn(),
    timeline: jest.fn(),
    cancelAll: jest.fn(),
  }
  return { driver, calls }
}

describe('startAmbient', () => {
  function dom(): HTMLElement {
    const root = document.createElement('div')
    root.innerHTML = '<div data-part="icon[0]"></div><div data-part="icon[0].disc"></div><div data-part="icon[1]"></div><div data-part="label"></div><div data-part="icons"></div>'
    return root
  }

  it('the indexed parts of a name, in order (not their sub-parts, not other names)', () => {
    const root = dom()
    expect(ambientTargets(root, 'icon').map((e) => e.getAttribute('data-part'))).toEqual(['icon[0]', 'icon[1]'])
    expect(ambientTargets(root, undefined)).toEqual([root])
  })

  it('loops forever, phase-shifted per part; the stopper cancels every loop', () => {
    const root = dom()
    const { driver, calls } = recordingDriver()
    const r = resolveAmbient({ props: {} }, def({ preset: 'bob', part: 'icon', stagger: 250 }), 'expressive')!
    const stop = startAmbient(root, r, driver)
    expect(calls).toHaveLength(2)
    expect(calls.map((c) => c.opts.delay)).toEqual([0, 250])
    expect(calls.every((c) => c.opts.iterations === Infinity && c.opts.direction === 'alternate')).toBe(true)
    expect(calls[0].opts.duration).not.toBe(calls[1].opts.duration)
    stop()
    expect(calls.every((c) => c.cancelled)).toBe(true)
  })

  it('a clipped loop clips the root while it runs and moves its children in step', () => {
    const root = document.createElement('div')
    root.innerHTML = '<img data-part="image"><div></div>'
    const { driver, calls } = recordingDriver()
    const stop = startAmbient(root, resolveAmbient({ props: {}, motion: { preset: 'ken-burns' } }, undefined, 'expressive')!, driver)
    expect(root.style.overflow).toBe('hidden')
    expect(calls).toHaveLength(2)
    expect(calls[0].opts.duration).toBe(calls[1].opts.duration)
    stop()
    expect(root.style.overflow).toBe('')
  })

  it('a spin turns about the element centre (an SVG part about its own box)', () => {
    const root = document.createElement('div')
    root.innerHTML = '<svg><path data-part="ring[0]" d="M0 0"></path></svg>'
    const { driver, calls } = recordingDriver()
    startAmbient(root, resolveAmbient({ props: {} }, def({ preset: 'spin', part: 'ring' }), 'expressive')!, driver)
    expect(calls[0].opts.origin).toBe('50% 50%')
    expect(calls[0].opts.direction).toBe('normal')
    expect((calls[0].target as SVGElement).style.getPropertyValue('transform-box')).toBe('fill-box')
  })
})

describe('driver loop options', () => {
  it('WAAPI passes iterations and direction to element.animate, and rotate as a property', () => {
    const el = document.createElement('div')
    const animate = jest.fn(() => ({ finished: new Promise(() => undefined), cancel: jest.fn(), playState: 'running', effect: null }))
    ;(el as unknown as { animate: unknown }).animate = animate
    createWAAPI_driver().play(el, { rotate: ['0deg', '360deg'] }, { duration: 1000, iterations: Infinity, direction: 'alternate' })
    const [frames, timing] = animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions]
    expect(frames[1]).toEqual({ rotate: '360deg' })
    expect(timing.iterations).toBe(Infinity)
    expect(timing.direction).toBe('alternate')
  })

  it('GSAP repeats forever with yoyo, rotation in degrees, sine ease', () => {
    const calls: Array<{ from: Record<string, unknown>; to: Record<string, unknown> }> = []
    const gsap: GsapInstance = {
      fromTo: (_t, from, to) => {
        calls.push({ from, to })
        return { kill: jest.fn(), then: () => new Promise<void>(() => undefined) }
      },
      timeline: jest.fn(),
    }
    const d = createGsapDriver(gsap)
    d.play(document.createElement('div'), AMBIENT_PRESETS.sway.keyframes(1), { duration: 2000, iterations: Infinity, direction: 'alternate', easing: AMBIENT_PRESETS.sway.easing })
    expect(calls[0].from.rotation).toBe(-5)
    expect(calls[0].to).toMatchObject({ rotation: 5, repeat: -1, yoyo: true, ease: 'sine.inOut', duration: 2 })
    d.play(document.createElement('div'), { opacity: [0, 1] }, { duration: 300, iterations: 3 })
    expect(calls[1].to.repeat).toBe(2)
    d.play(document.createElement('div'), { opacity: [0, 1] }, { duration: 300 })
    expect(calls[2].to.repeat).toBeUndefined()
    expect(calls[2].to.yoyo).toBeUndefined()
    // the strong overshoot plays as a real spring
    d.play(document.createElement('div'), { scale: [0.9, 1] }, { duration: 300, easing: 'cubic-bezier(0.34, 3.85, 0.64, 1)' })
    expect(calls[3].to.ease).toBe('elastic.out(1, 0.5)')
  })
})
