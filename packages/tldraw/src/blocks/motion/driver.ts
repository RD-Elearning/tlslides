/**
 * Motion driver interface and supporting types (05-motion-system.md §5.6).
 *
 * A `MotionDriver` is the bridge between the declarative motion recipe on a `BlockSpec`
 * and the imperative world of browser animations. Only one property vocabulary is allowed:
 * opacity, translate, scale, clip-path, filter, stroke-dashoffset. Properties like
 * `transform`, `width`, `height`, `top`, `left`, and `box-shadow` are never touched —
 * enforced by test.
 */

// --- Allowed CSS property vocabulary ------------------------------------------

/**
 * CSS property names the driver is permitted to animate or set.
 * Kept as a const tuple so tests can iterate it.
 */
export const ALLOWED_PROPERTIES = [
  'opacity',
  'translate',
  'scale',
  'clip-path',
  'filter',
  'stroke-dashoffset',
] as const

/**
 * CSS property names that must NEVER be touched by the driver.
 */
export const FORBIDDEN_PROPERTIES = [
  'transform',
  'width',
  'height',
  'top',
  'left',
  'box-shadow',
] as const

// --- Keyframes ----------------------------------------------------------------

/**
 * Keyframes passed to `MotionDriver.play()`. Each property is an array of values
 * (WAAPI-style: first = from, last = to). Only the allowed vocabulary is accepted.
 */
export interface MotionKeyframes {
  opacity?: number[]
  translate?: string[]
  scale?: number[]
  clipPath?: string[]
  filter?: string[]
  strokeDashoffset?: string[]
}

// --- Options ------------------------------------------------------------------

/**
 * Options for `MotionDriver.play()` — mirrors relevant WAAPI `KeyframeAnimationOptions`.
 */
export interface MotionOptions {
  /** Duration in ms. */
  duration?: number
  /** CSS easing function string. */
  easing?: string
  /** Fill mode: 'none' | 'forwards' | 'backwards' | 'both'. */
  fill?: FillMode
  /** Delay in ms. */
  delay?: number
  /** Optional progress callback, called with a 0→1 value as the animation advances.
   *  Used by count-up textContent tweens — the callback writes the interpolated number
   *  so the tween obeys `cancelAll()` and reduced motion (R5). The driver is not required
   *  to call this at any specific frequency; the recording driver calls it once at the end
   *  of `play()` with progress=1. */
  onUpdate?: (progress: number) => void
}

// --- Handle -------------------------------------------------------------------

/**
 * A handle returned by `play()` or `timeline()` that lets the caller cancel
 * or await completion.
 */
export interface MotionHandle {
  cancel(): void
  finished: Promise<void>
}

// --- State (instant set) ------------------------------------------------------

/**
 * A snapshot of CSS properties applied instantly via `set()`, not animated.
 */
export interface MotionState {
  opacity?: number
  translate?: string
  scale?: number
  clipPath?: string
  filter?: string
  strokeDashoffset?: string
}

// --- Timeline step -----------------------------------------------------------

/**
 * One step in a timeline: a target element plus its keyframes and options.
 */
export interface MotionStep {
  target: Element
  keyframes: MotionKeyframes
  options?: MotionOptions
}

// --- Driver interface ---------------------------------------------------------

/**
 * Abstract motion driver. Implementations translate declarative motion recipes into
 * concrete browser (or server) animations.
 */
export interface MotionDriver {
  /**
   * Animate `target` with the given `keyframes` and options.
   * Returns a handle to cancel or await.
   */
  play(target: Element, keyframes: MotionKeyframes, opts: MotionOptions): MotionHandle

  /**
   * Instantly set CSS properties on `target` — no animation.
   */
  set(target: Element, state: MotionState): void

  /**
   * Play a sequence of steps. Returns a handle for the *entire* timeline.
   */
  timeline(steps: MotionStep[]): MotionHandle

  /**
   * Cancel every in-flight animation started by this driver.
   */
  cancelAll(): void
}
