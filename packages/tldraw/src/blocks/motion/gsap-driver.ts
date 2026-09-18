/**
 * GSAP-backed `MotionDriver` adapter (05-motion-system.md §5.6, R3).
 *
 * A host that has GSAP passes its instance in once; this driver contains **no `import` of
 * `gsap`** — so it adds no dependency and about 2 KB to the bundle. It maps the same
 * keyframe vocabulary WAAPI uses to `gsap.fromTo`, refuses `FORBIDDEN_PROPERTIES` exactly
 * as the WAAPI driver does, and reports `finished` through the driver's promise so
 * build-step chaining is unchanged.
 *
 * The `gsap` parameter is typed structurally — not as `typeof import('gsap')` — so
 * `@types/gsap` is not needed either.
 *
 * Seconds vs milliseconds: GSAP takes seconds, the runtime hands out milliseconds.
 * All division is done once here.
 */

import type {
  MotionDriver,
  MotionHandle,
  MotionKeyframes,
  MotionOptions,
  MotionState,
  MotionStep,
} from './driver'
import { ALLOWED_PROPERTIES } from './driver'

// --- Structural GSAP types (no `import gsap` needed) ---------------------------

/** Structural type for a GSAP tween target vars object. Only the CSS properties
 *  the driver actually uses are listed. */
export interface GsapVars {
  opacity?: number
  x?: number
  y?: number
  scale?: number
  clipPath?: string
  filter?: string
  strokeDashoffset?: number | string
  duration?: number
  delay?: number
  ease?: string
  onComplete?: () => void
  [key: string]: unknown
}

/** Structural type for a GSAP timeline instance. */
export interface GsapTimeline {
  fromTo(target: unknown, from: GsapVars, to: GsapVars): GsapTimeline
  play(): void
  pause(): void
  kill(): void
  then(callback?: () => void): Promise<void>
  readonly duration: () => number
}

/** Structural type for the GSAP library object. */
export interface GsapInstance {
  fromTo(target: unknown, from: GsapVars, to: GsapVars): { kill(): void; then(cb?: () => void): Promise<void> }
  timeline(): GsapTimeline
}

// --- Helpers ------------------------------------------------------------------

/**
 * Map our friendly keyframe property names → GSAP property names.
 * GSAP uses `x`, `y` for translate, not `translate` as a CSS property.
 */
const GSAP_KEYFRAME_MAP: Record<string, string> = {
  opacity: 'opacity',
  translate: '_translate',   // special: split into x/y
  scale: 'scale',
  clipPath: 'clipPath',
  filter: 'filter',
  strokeDashoffset: 'strokeDashoffset',
}

/**
 * Map JS-side keyframe names to the CSS spelling used in ALLOWED_PROPERTIES.
 * Same issue as waapi-driver: `clipPath` (JS) vs `clip-path` (CSS).
 */
const KEYFRAME_TO_CSS: Record<string, string> = {
  opacity: 'opacity',
  translate: 'translate',
  scale: 'scale',
  clipPath: 'clip-path',
  filter: 'filter',
  strokeDashoffset: 'stroke-dashoffset',
}

/**
 * Is this authoring-side property name one the driver is allowed to animate?
 * Map through KEYFRAME_TO_CSS to get CSS spelling, then check ALLOWED_PROPERTIES.
 */
function isAllowedProperty(key: string): boolean {
  const cssProp = KEYFRAME_TO_CSS[key]
  if (!cssProp) return false
  return (ALLOWED_PROPERTIES as readonly string[]).includes(cssProp)
}

/**
 * Assert that a keyframes object only contains allowed properties.
 * Throws in development if a forbidden property is present.
 */
function assertAllowedKeyframes(keyframes: MotionKeyframes): void {
  for (const key of Object.keys(keyframes)) {
    if (!isAllowedProperty(key)) {
      throw new Error(`motion/gsap-driver: forbidden keyframe property "${key}"`)
    }
  }
}

/**
 * Assert that a state object only contains allowed properties.
 */
function assertAllowedState(state: MotionState): void {
  for (const key of Object.keys(state)) {
    if (!isAllowedProperty(key)) {
      throw new Error(`motion/gsap-driver: forbidden state property "${key}"`)
    }
  }
}

/**
 * Parse a translate string like "10px 20px" into { x, y } in pixels.
 * Falls back to 0 for each axis if parsing fails.
 */
function parseTranslate(val: string | undefined): { x: number; y: number } {
  if (!val) return { x: 0, y: 0 }
  const parts = val.split(/\s+/)
  const parse = (s: string) => {
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n
  }
  return { x: parse(parts[0]), y: parse(parts[1] ?? parts[0]) }
}

/**
 * Convert MotionKeyframes into GSAP from/to vars.
 * Numbers for opacity/scale are passed directly; translate is split into x/y.
 */
function toGsapVars(keyframes: MotionKeyframes, isFrom: boolean): GsapVars {
  const vars: GsapVars = {}
  for (const [key, values] of Object.entries(keyframes)) {
    if (!values || values.length === 0) continue
    const val = isFrom ? values[0] : values[values.length - 1]

    if (key === 'translate') {
      const parsed = parseTranslate(String(val))
      vars.x = parsed.x
      vars.y = parsed.y
    } else if (key === 'opacity' || key === 'scale') {
      vars[key] = typeof val === 'number' ? val : parseFloat(String(val))
    } else if (key === 'clipPath' || key === 'filter') {
      vars[key] = String(val)
    } else if (key === 'strokeDashoffset') {
      vars.strokeDashoffset = typeof val === 'number' ? val : parseFloat(String(val))
    }
  }
  return vars
}

// --- Driver implementation ----------------------------------------------------

/**
 * Convert CSS easing string to GSAP ease string.
 * GSAP uses its own ease naming: "power2.out", "power1.inOut", etc.
 * We provide a basic mapping for common CSS easings; custom cubic-beziers
 * fall back to a GSAP CustomEase-like approach or "power2.out".
 */
function cssEaseToGsap(ease: string): string {
  const map: Record<string, string> = {
    'ease-out': 'power2.out',
    'ease-in': 'power2.in',
    'ease-in-out': 'power1.inOut',
    'linear': 'none',
    'cubic-bezier(0.22, 1, 0.36, 1)': 'power3.out',
    'cubic-bezier(0.34, 1.36, 0.64, 1)': 'back.out(1.7)',
    'cubic-bezier(0.34, 3.85, 0.64, 1)': 'back.out(3)',
  }
  return map[ease] ?? 'power2.out'
}

/**
 * Create a GSAP-backed `MotionDriver`.
 *
 * @param gsap - The host's GSAP instance, typed structurally (no `@types/gsap` needed).
 */
export function createGsapDriver(gsap: GsapInstance): MotionDriver {
  /** All active kill functions / timelines for cancelAll. */
  const active = new Set<{ kill(): void }>()

  function play(
    target: Element,
    keyframes: MotionKeyframes,
    opts: MotionOptions
  ): MotionHandle {
    assertAllowedKeyframes(keyframes)

    const fromVars = toGsapVars(keyframes, true)
    const toVars = toGsapVars(keyframes, false)

    // Add GSAP timing: convert ms → seconds
    toVars.duration = (opts.duration ?? 300) / 1000
    toVars.delay = (opts.delay ?? 0) / 1000
    toVars.ease = cssEaseToGsap(opts.easing ?? 'ease-out')
    toVars.onComplete = undefined // resolved via .then()

    const tween = gsap.fromTo(target, fromVars, toVars)
    active.add(tween)

    let resolveFn: () => void
    const finished = new Promise<void>((resolve) => {
      resolveFn = resolve
    })

    tween.then(() => {
      active.delete(tween)
      resolveFn()
    })

    return {
      cancel() {
        tween.kill()
        active.delete(tween)
        resolveFn()
      },
      finished,
    }
  }

  function set(target: Element, state: MotionState): void {
    assertAllowedState(state)
    const vars: GsapVars = {}
    for (const [key, value] of Object.entries(state)) {
      if (value === undefined) continue
      if (key === 'translate') {
        const parsed = parseTranslate(String(value))
        vars.x = parsed.x
        vars.y = parsed.y
      } else if (key === 'opacity' || key === 'scale') {
        vars[key] = typeof value === 'number' ? value : parseFloat(String(value))
      } else if (key === 'clipPath' || key === 'filter') {
        vars[key] = String(value)
      } else if (key === 'strokeDashoffset') {
        vars.strokeDashoffset = typeof value === 'number' ? value : parseFloat(String(value))
      }
    }
    // Set immediately (duration 0)
    gsap.fromTo(target, {}, { ...vars, duration: 0 })
  }

  function timeline(steps: MotionStep[]): MotionHandle {
    if (steps.length === 0) {
      return {
        cancel() { /* no-op */ },
        finished: Promise.resolve(),
      }
    }

    const tl = gsap.timeline()
    active.add(tl)

    for (const step of steps) {
      const fromVars = toGsapVars(step.keyframes, true)
      const toVars = toGsapVars(step.keyframes, false)
      toVars.duration = (step.options?.duration ?? 300) / 1000
      toVars.delay = (step.options?.delay ?? 0) / 1000
      toVars.ease = cssEaseToGsap(step.options?.easing ?? 'ease-out')
      tl.fromTo(step.target, fromVars, toVars)
    }

    let resolveFn: () => void
    const finished = new Promise<void>((resolve) => {
      resolveFn = resolve
    })

    tl.then(() => {
      active.delete(tl)
      resolveFn()
    })

    return {
      cancel() {
        tl.kill()
        active.delete(tl)
        resolveFn()
      },
      finished,
    }
  }

  function cancelAll(): void {
    for (const item of active) {
      item.kill()
    }
    active.clear()
  }

  return { play, set, timeline, cancelAll }
}
