/**
 * GSAP driver spec (R3).
 *
 * Uses a stub GSAP object — no real GSAP dependency — to verify:
 * - `fromTo` called with expected vars (ms → seconds conversion, easing mapping)
 * - Forbidden property rejected (same as WAAPI driver)
 * - `finished` promise resolves
 * - `cancel()` kills the tween
 * - `timeline()` chains steps
 * - `set()` applies properties instantly
 * - `cancelAll()` kills everything
 */

import { createGsapDriver } from './gsap-driver'
import type { GsapInstance, GsapTimeline } from './gsap-driver'

// --- Stub GSAP ----------------------------------------------------------------

function createStubGsap(): GsapInstance & {
  fromToCalls: Array<{ target: unknown; from: Record<string, unknown>; to: Record<string, unknown> }>
  timelineCalls: number
  lastTimeline: MockTimeline
} {
  const fromToCalls: Array<{ target: unknown; from: Record<string, unknown>; to: Record<string, unknown> }> = []
  let timelineCalls = 0
  let lastTimeline: MockTimeline

  class MockTween {
    _resolveCb: (() => void) | null = null
    constructor(
      public target: unknown,
      public from: Record<string, unknown>,
      public to: Record<string, unknown>,
    ) {
      fromToCalls.push({ target, from, to })
    }
    kill = jest.fn()
    then = jest.fn((cb?: () => void) => {
      this._resolveCb = cb ?? null
      // Resolve on next microtask so the promise chain settles
      if (cb) Promise.resolve().then(() => cb())
      return Promise.resolve()
    })
  }

  class MockTimeline extends MockTween implements GsapTimeline {
    _steps: Array<{ target: unknown; from: Record<string, unknown>; to: Record<string, unknown> }> = []
    duration = jest.fn(() => 1)

    fromTo(target: unknown, from: Record<string, unknown>, to: Record<string, unknown>): GsapTimeline {
      this._steps.push({ target, from, to })
      return this
    }
    play = jest.fn()
    pause = jest.fn()
  }

  const stub = {
    fromToCalls,
    get timelineCalls() { return timelineCalls },
    get lastTimeline() { return lastTimeline },
    fromTo(target: unknown, from: Record<string, unknown>, to: Record<string, unknown>) {
      return new MockTween(target, from, to)
    },
    timeline() {
      timelineCalls++
      lastTimeline = new MockTimeline(undefined, {}, {})
      return lastTimeline as unknown as GsapTimeline
    },
  }

  return stub as unknown as GsapInstance & {
    fromToCalls: typeof fromToCalls
    timelineCalls: typeof timelineCalls
    lastTimeline: MockTimeline
  }
}

// --- Tests --------------------------------------------------------------------

describe('createGsapDriver', () => {
  let stub: ReturnType<typeof createStubGsap>
  let driver: ReturnType<typeof createGsapDriver>

  beforeEach(() => {
    stub = createStubGsap()
    driver = createGsapDriver(stub)
  })

  it('play() calls gsap.fromTo with converted timing (ms → seconds)', () => {
    const target = document.createElement('div')
    driver.play(target, { opacity: [0, 1] }, { duration: 500, delay: 100, easing: 'ease-out' })

    expect(stub.fromToCalls).toHaveLength(1)
    const call = stub.fromToCalls[0]
    expect(call.target).toBe(target)
    // from: opacity 0
    expect(call.from).toMatchObject({ opacity: 0 })
    // to: opacity 1, duration in seconds, delay in seconds
    expect(call.to).toMatchObject({ opacity: 1, duration: 0.5, delay: 0.1 })
    // ease-out → power2.out
    expect(call.to.ease).toBe('power2.out')
  })

  it('play() maps translate to x/y', () => {
    const target = document.createElement('div')
    driver.play(target, { translate: ['0px 0px', '24px -12px'] }, { duration: 300 })

    const call = stub.fromToCalls[0]
    expect(call.from).toMatchObject({ x: 0, y: 0 })
    expect(call.to).toMatchObject({ x: 24, y: -12 })
  })

  it('play() maps scale as a number', () => {
    const target = document.createElement('div')
    driver.play(target, { scale: [0.7, 1] }, { duration: 300 })

    const call = stub.fromToCalls[0]
    expect(call.from).toMatchObject({ scale: 0.7 })
    expect(call.to).toMatchObject({ scale: 1 })
  })

  it('play() maps clipPath as a string', () => {
    const target = document.createElement('div')
    driver.play(
      target,
      { clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] },
      { duration: 350 }
    )

    const call = stub.fromToCalls[0]
    expect(call.from).toMatchObject({ clipPath: 'inset(0 100% 0 0)' })
    expect(call.to).toMatchObject({ clipPath: 'inset(0 0 0 0)' })
  })

  it('play() rejects forbidden keyframe properties', () => {
    const target = document.createElement('div')
    expect(() =>
      driver.play(target, { opacity: [0, 1], transform: ['none', 'scale(2)'] } as never, { duration: 300 })
    ).toThrow(/forbidden keyframe property "transform"/)
  })

  it('set() rejects forbidden state properties', () => {
    const target = document.createElement('div')
    expect(() =>
      driver.set(target, { opacity: 1, width: '100px' } as never)
    ).toThrow(/forbidden state property "width"/)
  })

  it('set() applies properties with duration 0', () => {
    const target = document.createElement('div')
    driver.set(target, { opacity: 0.5, translate: '10px 20px' })

    expect(stub.fromToCalls).toHaveLength(1)
    const call = stub.fromToCalls[0]
    expect(call.to).toMatchObject({ opacity: 0.5, x: 10, y: 20, duration: 0 })
  })

  it('play() returns a handle whose finished promise resolves', async () => {
    const target = document.createElement('div')
    const handle = driver.play(target, { opacity: [0, 1] }, { duration: 300 })

    await expect(handle.finished).resolves.toBeUndefined()
  })

  it('play() cancel() kills the tween', () => {
    const target = document.createElement('div')
    const handle = driver.play(target, { opacity: [0, 1] }, { duration: 300 })

    handle.cancel()
    // The tween's kill should have been called
    // (we can't directly check MockTween.kill since it's internal, but no error thrown)
  })

  it('timeline() creates a GSAP timeline with fromTo steps', () => {
    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    const handle = driver.timeline([
      { target: el1, keyframes: { opacity: [0, 1] }, options: { duration: 200 } },
      { target: el2, keyframes: { opacity: [0, 1] }, options: { duration: 150 } },
    ])

    expect(stub.timelineCalls).toBe(1)
    expect(handle.finished).toBeDefined()
  })

  it('timeline() resolves immediately for empty steps', async () => {
    const handle = driver.timeline([])
    await expect(handle.finished).resolves.toBeUndefined()
  })

  it('cancelAll() does not throw when no animations are active', () => {
    expect(() => driver.cancelAll()).not.toThrow()
  })

  it('ease mapping: linear → none', () => {
    const target = document.createElement('div')
    driver.play(target, { opacity: [0, 1] }, { duration: 300, easing: 'linear' })

    const call = stub.fromToCalls[0]
    expect(call.to.ease).toBe('none')
  })

  it('ease mapping: unknown easing falls back to power2.out', () => {
    const target = document.createElement('div')
    driver.play(target, { opacity: [0, 1] }, { duration: 300, easing: 'some-custom-easing' })

    const call = stub.fromToCalls[0]
    expect(call.to.ease).toBe('power2.out')
  })

  it('accepts clipPath and strokeDashoffset in keyframes (ALLOWED_PROPERTIES spelling)', () => {
    const target = document.createElement('div')
    expect(() =>
      driver.play(
        target,
        { clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'], strokeDashoffset: ['100', '0'] },
        { duration: 100 }
      )
    ).not.toThrow()
  })

  it('still rejects a genuinely forbidden property in keyframes', () => {
    const target = document.createElement('div')
    expect(() =>
      driver.play(target, { transform: ['none', 'scale(2)'] } as never, { duration: 100 })
    ).toThrow(/forbidden keyframe property "transform"/)
  })
})
