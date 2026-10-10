/**
 * Web Animations API driver (05-motion-system.md §5.6).
 *
 * Uses `Element.animate()` for animated transitions and `element.style` for instant sets.
 * Only touches properties in the allowed vocabulary (opacity, translate, scale, clip-path,
 * filter, stroke-dashoffset). `will-change` is set before animation starts and removed
 * on finish or cancel.
 *
 * Zero new dependencies — WAAPI is a browser built-in.
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

// --- Helpers ------------------------------------------------------------------

/** Map our friendly keyframe property names → CSS property names for WAAPI. */
const KEYFRAME_MAP: Record<string, string> = {
  opacity: 'opacity',
  translate: 'translate',
  scale: 'scale',
  // One-axis scales are written into the CSS `scale` property ("x y"), see `axisScale`.
  scaleX: 'scale',
  scaleY: 'scale',
  clipPath: 'clip-path',
  filter: 'filter',
  strokeDashoffset: 'stroke-dashoffset',
}

/**
 * Is this authoring-side property name one the driver is allowed to animate?
 *
 * The allow-list in `driver.ts` is written in **CSS** spelling (`clip-path`,
 * `stroke-dashoffset`) while `MotionKeyframes`/`MotionState` — the only shapes a caller can
 * legally construct — are written in **JS** spelling (`clipPath`, `strokeDashoffset`). Comparing
 * the caller's key against the allow-list directly therefore rejected `clipPath` and
 * `strokeDashoffset` unconditionally, i.e. every wipe/mask-reveal preset the motion system
 * declares. Mapping through `KEYFRAME_MAP` first is what makes the two vocabularies agree, and
 * keeps `ALLOWED_PROPERTIES` the single source of truth rather than duplicating it in a second
 * spelling. An unmapped key is not in the map at all, so it still fails.
 */
function isAllowedProperty(key: string): boolean {
  const cssProp = KEYFRAME_MAP[key]
  return cssProp !== undefined && (ALLOWED_PROPERTIES as readonly string[]).includes(cssProp)
}

/**
 * Assert that a keyframes object only contains allowed properties.
 * Throws in development if a forbidden property is present.
 */
function assertAllowedKeyframes(keyframes: MotionKeyframes): void {
  for (const key of Object.keys(keyframes)) {
    if (!isAllowedProperty(key)) {
      throw new Error(`motion/waapi-driver: forbidden keyframe property "${key}"`)
    }
  }
}

/**
 * Assert that a state object only contains allowed properties.
 */
function assertAllowedState(state: MotionState): void {
  for (const key of Object.keys(state)) {
    if (!isAllowedProperty(key)) {
      throw new Error(`motion/waapi-driver: forbidden state property "${key}"`)
    }
  }
}

/**
 * Convert our `MotionKeyframes` into WAAPI-compatible `Keyframe[]`.
 */
function toWAAPIKeyframes(keyframes: MotionKeyframes): Keyframe[] {
  const from: Record<string, string> = {}
  const to: Record<string, string> = {}

  for (const [key, values] of Object.entries(keyframes)) {
    if (!values || values.length === 0) continue
    const cssProp = KEYFRAME_MAP[key]
    if (!cssProp) continue

    const first = values[0]
    const last = values[values.length - 1]

    // CMP3: a WAAPI keyframe names its property in IDL (camelCase) spelling; `clip-path` and
    // `stroke-dashoffset` keys were silently ignored, so every wipe and draw-on played nothing under
    // this (the default) driver and its parts stayed at their hidden state.
    const idl = cssProp.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())
    from[idl] = String(first)
    to[idl] = String(last)
  }

  // scaleX / scaleY: CSS has one `scale` property, so combine the axes into "x y".
  if (keyframes.scaleX || keyframes.scaleY) {
    const end = (v: number[] | undefined, i: 0 | 1) => (v && v.length ? v[i === 0 ? 0 : v.length - 1] : undefined)
    for (const [i, kf] of [[0, from], [1, to]] as const) {
      const base = end(keyframes.scale, i) ?? 1
      kf.scale = `${end(keyframes.scaleX, i) ?? base} ${end(keyframes.scaleY, i) ?? base}`
    }
  }

  return [from, to]
}

/** CSS `scale` for a state carrying one-axis scales. */
function axisScale(state: MotionState): string | undefined {
  if (state.scaleX === undefined && state.scaleY === undefined) return undefined
  const base = state.scale ?? 1
  return `${state.scaleX ?? base} ${state.scaleY ?? base}`
}

/**
 * Compute a `will-change` string from the keyframe property names.
 */
function willChangeFor(keyframes: MotionKeyframes): string {
  const props = Object.keys(keyframes)
    .map((k) => KEYFRAME_MAP[k])
    .filter(Boolean)
  return props.length > 0 ? props.join(', ') : 'auto'
}

/**
 * Set `will-change` on an element, return a cleanup function.
 */
function applyWillChange(element: Element, keyframes: MotionKeyframes): () => void {
  const wc = willChangeFor(keyframes)
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- no-op cleanup when no will-change needed
  if (wc === 'auto') return () => {}
  ;(element as HTMLElement).style.willChange = wc
  return () => {
    (element as HTMLElement).style.willChange = ''
  }
}

// --- Driver implementation ----------------------------------------------------

/**
 * Create a WAAPI-backed `MotionDriver`.
 */
export function createWAAPI_driver(): MotionDriver {
  /** All active `Animation` objects, keyed by element. */
  const active = new Set<Animation>()

  function play(
    target: Element,
    keyframes: MotionKeyframes,
    opts: MotionOptions
  ): MotionHandle {
    assertAllowedKeyframes(keyframes)

    const cleanup = applyWillChange(target, keyframes)
    if (opts.origin) (target as HTMLElement).style.transformOrigin = opts.origin
    const waaKeyframes = toWAAPIKeyframes(keyframes)
    const duration = opts.duration ?? 300
    const animation = target.animate(waaKeyframes, {
      duration,
      easing: opts.easing ?? 'ease-out',
      fill: opts.fill ?? 'forwards',
      delay: opts.delay ?? 0,
    })
    active.add(animation)

    // Fire onUpdate(progress) on each animation frame when provided.
    let rafId: number | undefined
    if (opts.onUpdate) {
      const onUpdate = opts.onUpdate
      const startTime = performance.now() + (opts.delay ?? 0)
      // CMP3: the progress is the animation's own (eased, like the GSAP driver's ratio, and on the
      // document timeline, so a slowed or paused timeline slows the count with the motion); the
      // wall clock is the fallback where computed timing is not available.
      const timed = (animation.effect as { getComputedTiming?: () => ComputedEffectTiming } | null)?.getComputedTiming
      const tick = () => {
        let progress: number
        if (typeof timed === 'function') {
          const t = (animation.effect as KeyframeEffect).getComputedTiming()
          progress = animation.playState === 'finished' ? 1 : typeof t.progress === 'number' ? Math.min(1, Math.max(0, t.progress)) : (t.localTime ?? 0) > (opts.delay ?? 0) ? 1 : 0
        } else {
          const elapsed = performance.now() - startTime
          progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 1
        }
        // a cancelled tween still ends on its final value (the count shows the authored text)
        if (animation.playState === 'idle') progress = 1
        onUpdate(progress)
        if (progress < 1) {
          rafId = requestAnimationFrame(tick)
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    // Settle will-change cleanup on both resolve and reject (cancel).
    const finished = animation.finished.then(
      () => {
        active.delete(animation)
        if (rafId !== undefined) cancelAnimationFrame(rafId)
        cleanup()
      },
      () => {
        active.delete(animation)
        if (rafId !== undefined) cancelAnimationFrame(rafId)
        cleanup()
      }
    )

    return {
      cancel() {
        animation.cancel()
      },
      finished,
    }
  }

  function set(target: Element, state: MotionState): void {
    assertAllowedState(state)
    const el = target as HTMLElement
    // A set is final (S8): a forwards-filled animation on the same property would otherwise
    // keep overriding the inline style written below.
    const cssProps = new Set(Object.keys(state).map((k) => KEYFRAME_MAP[k]).filter(Boolean))
    if (typeof el.getAnimations === 'function') {
      for (const anim of el.getAnimations()) {
        if (!active.has(anim)) continue
        const kfs = anim.effect && 'getKeyframes' in anim.effect ? (anim.effect as KeyframeEffect).getKeyframes() : []
        const touches = kfs.some((k) => Object.keys(k).some((p) => cssProps.has(p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()))))
        if (touches) anim.cancel()
      }
    }
    const axis = axisScale(state)
    if (axis !== undefined) el.style.setProperty('scale', axis)
    for (const [key, value] of Object.entries(state)) {
      if (value === undefined) continue
      if (axis !== undefined && (key === 'scale' || key === 'scaleX' || key === 'scaleY')) continue
      const cssProp = KEYFRAME_MAP[key]
      if (!cssProp) continue

      if (typeof value === 'number') {
        el.style.setProperty(cssProp, String(value))
      } else {
        el.style.setProperty(cssProp, String(value))
      }
    }
  }

  function timeline(steps: MotionStep[]): MotionHandle {
    if (steps.length === 0) {
      return {
        cancel() {
          /* no-op: no steps to cancel */
        },
        finished: Promise.resolve(),
      }
    }

    // Chain animations: each step waits for the previous to finish.
    // We use a sequential promise chain and WAAPI's `delay` to sequence them.
    let cumulativeDelay = 0

    const handles: MotionHandle[] = []
    for (const step of steps) {
      const stepDuration = step.options?.duration ?? 300
      const h = play(step.target, step.keyframes, {
        ...step.options,
        delay: cumulativeDelay + (step.options?.delay ?? 0),
      })
      handles.push(h)
      cumulativeDelay += stepDuration + (step.options?.delay ?? 0)
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- cast to void, result unused
    const finished = Promise.all(handles.map((h) => h.finished)).then(() => {})

    return {
      cancel() {
        for (const h of handles) h.cancel()
      },
      finished,
    }
  }

  function cancelAll(): void {
    for (const anim of active) {
      anim.cancel()
    }
    active.clear()
  }

  return { play, set, timeline, cancelAll }
}
