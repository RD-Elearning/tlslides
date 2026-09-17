import {
  DURATION_TOKENS,
  EASING_TOKENS,
  DISTANCE_TOKENS,
  SCALE_TOKENS,
  BLUR_TOKENS,
} from './tokens'
import {
  ALLOWED_PROPERTIES,
  FORBIDDEN_PROPERTIES,
} from './driver'
import { createWAAPI_driver } from './waapi-driver'

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

describe('DURATION_TOKENS', () => {
  it('has 7 duration tokens from §5.2', () => {
    expect(Object.keys(DURATION_TOKENS)).toHaveLength(7)
  })

  it('has ascending durations: stagger < micro < quick < fast < medium < slow < verySlow', () => {
    const order = ['stagger', 'micro', 'quick', 'fast', 'medium', 'slow', 'verySlow'] as const
    for (let i = 1; i < order.length; i++) {
      expect(DURATION_TOKENS[order[i]]).toBeGreaterThan(DURATION_TOKENS[order[i - 1]])
    }
  })

  it('matches the doc literal values', () => {
    expect(DURATION_TOKENS.stagger).toBe(40)
    expect(DURATION_TOKENS.micro).toBe(80)
    expect(DURATION_TOKENS.quick).toBe(150)
    expect(DURATION_TOKENS.fast).toBe(250)
    expect(DURATION_TOKENS.medium).toBe(350)
    expect(DURATION_TOKENS.slow).toBe(400)
    expect(DURATION_TOKENS.verySlow).toBe(500)
  })

  it('is copied (not aliased) — spreading creates an equal but distinct object', () => {
    const copy = { ...DURATION_TOKENS }
    expect(copy).not.toBe(DURATION_TOKENS)
    expect(copy).toEqual(DURATION_TOKENS)
  })

  it('mutating a spread copy does not affect the original', () => {
    const copy = { ...DURATION_TOKENS }
    copy.fast = 9999
    expect(DURATION_TOKENS.fast).toBe(250)
    expect(copy.fast).toBe(9999)
  })
})

describe('EASING_TOKENS', () => {
  it('has 6 easing tokens from §5.2', () => {
    expect(Object.keys(EASING_TOKENS)).toHaveLength(6)
  })

  it('has the exact documented CSS easing strings', () => {
    expect(EASING_TOKENS.smoothOut).toBe('cubic-bezier(0.22, 1, 0.36, 1)')
    expect(EASING_TOKENS.inOut).toBe('ease-in-out')
    expect(EASING_TOKENS.out).toBe('ease-out')
    expect(EASING_TOKENS.linear).toBe('linear')
    expect(EASING_TOKENS.bounce).toBe('cubic-bezier(0.34, 1.36, 0.64, 1)')
    expect(EASING_TOKENS.bounceStrong).toBe('cubic-bezier(0.34, 3.85, 0.64, 1)')
  })

  it('is copied (not aliased) — spreading creates an equal but distinct object', () => {
    const copy = { ...EASING_TOKENS }
    expect(copy).not.toBe(EASING_TOKENS)
    expect(copy).toEqual(EASING_TOKENS)
  })

  it('mutating a spread copy does not affect the original', () => {
    const copy = { ...EASING_TOKENS }
    copy.linear = 'step-end'
    expect(EASING_TOKENS.linear).toBe('linear')
    expect(copy.linear).toBe('step-end')
  })
})

describe('DISTANCE_TOKENS', () => {
  it('has 5 distance tokens from §5.2', () => {
    expect(Object.keys(DISTANCE_TOKENS)).toHaveLength(5)
  })

  it('matches doc literal values', () => {
    expect(DISTANCE_TOKENS.micro).toBe(12)
    expect(DISTANCE_TOKENS.small).toBe(18)
    expect(DISTANCE_TOKENS.base).toBe(24)
    expect(DISTANCE_TOKENS.medium).toBe(36)
    expect(DISTANCE_TOKENS.large).toBe(90)
  })

  it('is copied (not aliased) — spreading creates an equal but distinct object', () => {
    const copy = { ...DISTANCE_TOKENS }
    expect(copy).not.toBe(DISTANCE_TOKENS)
    expect(copy).toEqual(DISTANCE_TOKENS)
  })

  it('mutating a spread copy does not affect the original', () => {
    const copy = { ...DISTANCE_TOKENS }
    copy.base = 999
    expect(DISTANCE_TOKENS.base).toBe(24)
    expect(copy.base).toBe(999)
  })
})

describe('SCALE_TOKENS', () => {
  it('has 4 scale tokens from §5.2', () => {
    expect(Object.keys(SCALE_TOKENS)).toHaveLength(4)
  })

  it('matches doc literal values', () => {
    expect(SCALE_TOKENS.large).toBe(0.96)
    expect(SCALE_TOKENS.medium).toBe(0.97)
    expect(SCALE_TOKENS.small).toBe(0.98)
    expect(SCALE_TOKENS.tiny).toBe(0.99)
  })

  it('is copied (not aliased) — spreading creates an equal but distinct object', () => {
    const copy = { ...SCALE_TOKENS }
    expect(copy).not.toBe(SCALE_TOKENS)
    expect(copy).toEqual(SCALE_TOKENS)
  })

  it('mutating a spread copy does not affect the original', () => {
    const copy = { ...SCALE_TOKENS }
    copy.large = 0.5
    expect(SCALE_TOKENS.large).toBe(0.96)
    expect(copy.large).toBe(0.5)
  })
})

describe('BLUR_TOKENS', () => {
  it('has 3 blur tokens from §5.2', () => {
    expect(Object.keys(BLUR_TOKENS)).toHaveLength(3)
  })

  it('matches doc literal values', () => {
    expect(BLUR_TOKENS.small).toBe(2)
    expect(BLUR_TOKENS.medium).toBe(3)
    expect(BLUR_TOKENS.large).toBe(8)
  })

  it('is copied (not aliased) — spreading creates an equal but distinct object', () => {
    const copy = { ...BLUR_TOKENS }
    expect(copy).not.toBe(BLUR_TOKENS)
    expect(copy).toEqual(BLUR_TOKENS)
  })

  it('mutating a spread copy does not affect the original', () => {
    const copy = { ...BLUR_TOKENS }
    copy.large = 99
    expect(BLUR_TOKENS.large).toBe(8)
    expect(copy.large).toBe(99)
  })
})

// ---------------------------------------------------------------------------
// Driver — property allowlist
// ---------------------------------------------------------------------------

describe('MotionDriver property vocabulary', () => {
  it('ALLOWED_PROPERTIES contains exactly the six allowed CSS properties', () => {
    expect([...ALLOWED_PROPERTIES]).toEqual([
      'opacity',
      'translate',
      'scale',
      'clip-path',
      'filter',
      'stroke-dashoffset',
    ])
  })

  it('FORBIDDEN_PROPERTIES contains transform, width, height, top, left, box-shadow', () => {
    expect([...FORBIDDEN_PROPERTIES]).toEqual([
      'transform',
      'width',
      'height',
      'top',
      'left',
      'box-shadow',
    ])
  })

  it('ALLOWED_PROPERTIES and FORBIDDEN_PROPERTIES are disjoint', () => {
    const allowed = new Set(ALLOWED_PROPERTIES)
    for (const prop of FORBIDDEN_PROPERTIES) {
      expect(allowed.has(prop)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// WAAPI driver integration (jsdom — Element.animate is mocked)
// ---------------------------------------------------------------------------

describe('createWAAPI_driver', () => {
  let driver: ReturnType<typeof createWAAPI_driver>
  let mockElement: Element & { style: Record<string, string>; animate: jest.Mock }

  beforeEach(() => {
    driver = createWAAPI_driver()

    const style: Record<string, string> = {}
    const mockAnim = {
      finished: Promise.resolve(),
      cancel: jest.fn(),
    }

    mockElement = {
      style,
      animate: jest.fn().mockReturnValue(mockAnim),
      setProperty: jest.fn(),
    } as unknown as Element & { style: Record<string, string>; animate: jest.Mock }

    // Override setProperty to write into our style object
    mockElement.style.setProperty = jest.fn((prop: string, val: string) => {
      style[prop] = val
    })
  })

  it('play() calls Element.animate with WAAPI-compatible keyframes', () => {
    driver.play(mockElement, { opacity: [0, 1] }, { duration: 300 })

    expect(mockElement.animate).toHaveBeenCalledTimes(1)
    const [keyframes, opts] = mockElement.animate.mock.calls[0]
    expect(keyframes).toEqual([{ opacity: '0' }, { opacity: '1' }])
    expect(opts.duration).toBe(300)
    expect(opts.easing).toBe('ease-out')
    expect(opts.fill).toBe('forwards')
  })

  it('play() sets will-change before animation and removes it on finish', async () => {
    // Make finished a controllable promise
    let resolveFinished!: () => void
    const finishedPromise = new Promise<void>((r) => {
      resolveFinished = r
    })
    mockElement.animate.mockReturnValue({
      finished: finishedPromise,
      cancel: jest.fn(),
    })

    const handle = driver.play(mockElement, { opacity: [0, 1] }, { duration: 100 })

    // will-change should be set while animation is running
    expect(mockElement.style.willChange).toBe('opacity')

    // Resolve the animation
    resolveFinished()
    await handle.finished

    // will-change should be removed after finish
    expect(mockElement.style.willChange).toBe('')
  })

  it('play() removes will-change even when animation is cancelled', async () => {
    let rejectFinished!: (err: unknown) => void
    const finishedPromise = new Promise<void>((_, reject) => {
      rejectFinished = reject
    })
    mockElement.animate.mockReturnValue({
      finished: finishedPromise,
      cancel: jest.fn(),
    })

    const handle = driver.play(mockElement, { opacity: [0, 1] }, { duration: 100 })
    expect(mockElement.style.willChange).toBe('opacity')

    // Simulate cancellation (WAAPI rejects the promise)
    rejectFinished(new DOMException('The animation was cancelled.', 'AbortError'))

    // Give the microtask a chance to run
    await new Promise((r) => setTimeout(r, 0))

    expect(mockElement.style.willChange).toBe('')
  })

  it('set() applies properties directly via style', () => {
    driver.set(mockElement, { opacity: 0.5, translate: '10px 20px' })

    expect(mockElement.style.setProperty).toHaveBeenCalledWith('opacity', '0.5')
    expect(mockElement.style.setProperty).toHaveBeenCalledWith('translate', '10px 20px')
  })

  it('play() throws on a forbidden keyframe property', () => {
    expect(() => {
      driver.play(
        mockElement,
        { opacity: [0, 1], width: ['0px', '100px'] } as any,
        { duration: 300 }
      )
    }).toThrow('forbidden keyframe property')
  })

  it('set() throws on a forbidden state property', () => {
    expect(() => {
      driver.set(mockElement, { opacity: 0.5, transform: 'none' } as any)
    }).toThrow('forbidden state property')
  })

  it('cancelAll() cancels all active animations', async () => {
    let resolve1!: () => void
    let resolve2!: () => void
    const p1 = new Promise<void>((r) => { resolve1 = r })
    const p2 = new Promise<void>((r) => { resolve2 = r })
    const anim1 = { finished: p1, cancel: jest.fn() }
    const anim2 = { finished: p2, cancel: jest.fn() }

    // Second call returns different animation
    mockElement.animate
      .mockReturnValueOnce(anim1)
      .mockReturnValueOnce(anim2)

    driver.play(mockElement, { opacity: [0, 1] }, { duration: 300 })
    driver.play(mockElement, { opacity: [1, 0] }, { duration: 300 })

    driver.cancelAll()

    expect(anim1.cancel).toHaveBeenCalled()
    expect(anim2.cancel).toHaveBeenCalled()

    // Resolve so tests clean up
    resolve1()
    resolve2()
  })

  it('timeline() chains multiple steps with cumulative delay', () => {
    const el2 = {
      style: {},
      animate: jest.fn().mockReturnValue({ finished: Promise.resolve(), cancel: jest.fn() }),
      setProperty: jest.fn((p: string, v: string) => { (el2.style as any)[p] = v }),
    } as unknown as Element & { style: Record<string, string>; animate: jest.Mock }

    const steps = [
      { target: mockElement, keyframes: { opacity: [0, 1] }, options: { duration: 200 } },
      { target: el2, keyframes: { opacity: [0, 1] }, options: { duration: 150 } },
    ]

    driver.timeline(steps)

    // First animation: delay 0 + any step delay (0)
    expect(mockElement.animate).toHaveBeenCalledTimes(1)
    expect(mockElement.animate.mock.calls[0][1].delay).toBe(0)

    // Second animation: delay = 200 (first duration) + 0
    expect(el2.animate).toHaveBeenCalledTimes(1)
    expect(el2.animate.mock.calls[0][1].delay).toBe(200)
  })

  it('timeline() resolves immediately for empty steps', async () => {
    const handle = driver.timeline([])
    await expect(handle.finished).resolves.toBeUndefined()
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* The allow-list spelling mismatch — clipPath/strokeDashoffset used to throw       */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('waapi-driver allow-list accepts the spellings its own types mandate', () => {
  function fakeElement() {
    const el = {
      animate: jest.fn(() => ({
        finished: Promise.resolve(),
        cancel: jest.fn(),
        pause: jest.fn(),
        play: jest.fn(),
      })),
      style: { setProperty: jest.fn(), removeProperty: jest.fn() } as unknown as CSSStyleDeclaration,
    }
    return el as unknown as Element
  }

  it('accepts clipPath and strokeDashoffset keyframes (ALLOWED_PROPERTIES spells them in CSS)', () => {
    const driver = createWAAPI_driver()
    const el = fakeElement()
    expect(() =>
      driver.play(
        el,
        { clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'], strokeDashoffset: ['100', '0'] },
        { durationMs: 100 }
      )
    ).not.toThrow()
  })

  it('accepts clipPath in set() too — the reduced-motion path', () => {
    const driver = createWAAPI_driver()
    const el = fakeElement()
    expect(() => driver.set(el, { clipPath: 'inset(0 0 0 0)', opacity: 1 })).not.toThrow()
  })

  it('still rejects a genuinely forbidden property', () => {
    const driver = createWAAPI_driver()
    const el = fakeElement()
    expect(() =>
      driver.play(el, { transform: ['none', 'scale(2)'] } as never, { durationMs: 100 })
    ).toThrow(/forbidden keyframe property "transform"/)
    expect(() => driver.set(el, { width: '10px' } as never)).toThrow(
      /forbidden state property "width"/
    )
  })
})
