/**
 * `playBlockReveal` — one function, three callers (DeckViewer, PresentationRuntime,
 * R12 inspector Preview). Resolves a block's motion recipe (block-level + part-level)
 * and drives the reveal through a `MotionDriver`.
 *
 * **No React import.** This module is pure DOM + driver — it can be consumed by any
 * caller that has a mounted `HTMLElement` for the block and a `MotionDriver`.
 *
 * ## Ordering invariant (R5)
 *
 * 1. `driver.set(part, hiddenState)` for **every** part synchronously — parts are set
 *    up while the whole block is still at `opacity: 0`.
 * 2. `driver.play(block)` — the block-level entrance animation starts.
 * 3. `driver.play(part, ...)` with staggered delays — each part's own choreography.
 *
 * Because parts are children of the block container, the block's opacity/translate
 * composes with each part's own animation. A block-level `FadeIn` that fades the
 * container from 0 → 1 while parts stagger-fade from 0 → 1 produces a natural
 * compound effect.
 *
 * ## Count-up (textContent tween)
 *
 * Parts with a `count-up` preset get an `onUpdate(progress)` callback that writes
 * the interpolated number to `textContent`. This runs through the driver's progress
 * callback so it obeys `cancelAll()` and reduced motion. The target value is read
 * from the element's existing textContent before the tween starts.
 *
 * @module motion/play-reveal
 */

import type { AnimationEffect } from '~types'
import type { MotionDriver, MotionKeyframes, MotionState } from './driver'
import { resolveBlockMotion, resolvePartMotion } from './resolve-motion'
import type { BlockSpec, BlockDefinition } from '../types'
import { EASING_TOKENS, DURATION_TOKENS } from './tokens'

// --- Types -------------------------------------------------------------------

/**
 * Runtime context passed by the caller. Contains everything the reveal function
 * needs from the host environment — no React, no store, no app.
 */
export interface PlayBlockRevealContext {
  /** The motion driver to play animations through. */
  driver: MotionDriver
  /** When true, skip all animations — set visible state immediately. */
  reducedMotion: boolean
}

// --- Helpers -----------------------------------------------------------------

/**
 * Extract the "from" state (first value of each keyframe array) so a part can be
 * set to its hidden position before its animation plays.
 */
function hiddenStateFromKeyframes(keyframes: MotionKeyframes): MotionState {
  const state: MotionState = {}
  if (keyframes.opacity !== undefined) state.opacity = keyframes.opacity[0]
  if (keyframes.translate !== undefined) state.translate = keyframes.translate[0]
  if (keyframes.scale !== undefined) state.scale = keyframes.scale[0]
  if (keyframes.clipPath !== undefined) state.clipPath = keyframes.clipPath[0]
  if (keyframes.filter !== undefined) state.filter = keyframes.filter[0]
  if (keyframes.strokeDashoffset !== undefined) state.strokeDashoffset = keyframes.strokeDashoffset[0]
  return state
}

/**
 * The settled, fully-revealed state — the "to" target for the block-level entrance.
 */
function blockVisibleState(effect?: AnimationEffect): MotionState {
  if (effect === 'wipe' as AnimationEffect) {
    return { opacity: 1, translate: '0px 0px', scale: 1, clipPath: 'inset(0 0 0 0)' }
  }
  return { opacity: 1, translate: '0px 0px', scale: 1 }
}

/**
 * Hidden state for the block container — matches the block-level effect.
 * Uses the same mapping as `DeckViewer/motion-helpers.ts` but without importing it,
 * keeping this module dependency-light and import-graph clean.
 */
function blockHiddenState(effect: AnimationEffect): MotionState {
  switch (effect) {
    case 'slideIn' as AnimationEffect:
      return { opacity: 0, translate: '0px 32px', scale: 1 }
    case 'zoomIn' as AnimationEffect:
      return { opacity: 0, translate: '0px 0px', scale: 0.7 }
    case 'wipe' as AnimationEffect:
      return { opacity: 1, translate: '0px 0px', scale: 1, clipPath: 'inset(0 100% 0 0)' }
    case 'fadeIn' as AnimationEffect:
    default:
      return { opacity: 0, translate: '0px 0px', scale: 1 }
  }
}

/**
 * Build block-level `MotionKeyframes` from the resolved effect — the same four
 * effects the existing `entranceKeyframes` helper builds, but expressed here to
 * keep this module self-contained (no import from `DeckViewer/`).
 */
function blockEntranceKeyframes(effect: AnimationEffect): MotionKeyframes {
  const from = blockHiddenState(effect)
  const to = blockVisibleState(effect)
  const kf: MotionKeyframes = {}
  if (from.opacity !== to.opacity) kf.opacity = [from.opacity ?? 1, to.opacity ?? 1]
  if (from.translate !== to.translate) kf.translate = [from.translate ?? '0px 0px', to.translate ?? '0px 0px']
  if (from.scale !== to.scale) kf.scale = [from.scale ?? 1, to.scale ?? 1]
  if (from.clipPath !== undefined && to.clipPath !== undefined && from.clipPath !== to.clipPath) {
    kf.clipPath = [from.clipPath, to.clipPath]
  }
  return kf
}

/**
 * Resolve an easing value to a CSS easing string, falling back to smoothOut.
 * Accepts a CSS string directly or falls back to the token scale.
 */
function resolveEasingString(easing?: string): string {
  if (easing) return easing
  return EASING_TOKENS.smoothOut
}

// --- Public API ---------------------------------------------------------------

/**
 * Play a block's reveal animation — both block-level (the container entering) and
 * part-level (per-part stagger, count-up, draw-path, etc.) choreography.
 *
 * @param el  The block's root DOM element (the positioned `<div>` that wraps it).
 * @param spec The block instance's spec (from `shapeToBlock(shape)`).
 * @param def  The block definition (from `registry.get(type)`).
 * @param ctx  Runtime context: driver + reduced-motion flag.
 */
export function playBlockReveal(
  el: HTMLElement,
  spec: BlockSpec,
  def: BlockDefinition,
  ctx: PlayBlockRevealContext
): void {
  const { driver, reducedMotion } = ctx

  // 1. Resolve block-level and part-level motion.
  const blockMotion = resolveBlockMotion(spec.motion, def.motion)
  const partMotions = resolvePartMotion(spec.motion, def.motion)

  // 2. Reduced motion or no effect → set visible state immediately, no animation.
  if (reducedMotion || blockMotion.effect === null) {
    driver.set(el, blockVisibleState(blockMotion.effect ?? undefined))
    // Also settle any parts to visible.
    for (const pm of partMotions) {
      const partEls = el.querySelectorAll(`[data-part="${pm.partName}"]`)
      partEls.forEach((partEl) => {
        driver.set(partEl as HTMLElement, { opacity: 1, translate: '0px 0px', scale: 1 })
      })
    }
    return
  }

  // 3. Set hidden state on ALL parts synchronously, before the block becomes visible.
  //    Parts are children of `el`, so they're invisible while the block is at opacity: 0.
  for (const pm of partMotions) {
    const partEls = el.querySelectorAll(`[data-part="${pm.partName}"]`)
    partEls.forEach((partEl) => {
      driver.set(partEl as HTMLElement, hiddenStateFromKeyframes(pm.keyframes))
    })
  }

  // 4. Set hidden state on the block container.
  driver.set(el, blockHiddenState(blockMotion.effect))

  // 5. Build block-level keyframes and play.
  const blockKeyframes = blockEntranceKeyframes(blockMotion.effect)
  const blockEasing = resolveEasingString(blockMotion.effect === ('wipe' as AnimationEffect)
    ? EASING_TOKENS.smoothOut
    : undefined)

  driver.play(el, blockKeyframes, {
    duration: blockMotion.durationMs,
    delay: blockMotion.delayMs,
    easing: blockMotion.effect === ('wipe' as AnimationEffect) ? EASING_TOKENS.smoothOut : blockEasing,
    fill: 'forwards',
  })

  // 6. Play part-level animations with stagger.
  for (const pm of partMotions) {
    const partEls = el.querySelectorAll(`[data-part="${pm.partName}"]`)
    partEls.forEach((partEl) => {
      // Count-up: intercept onUpdate to tween textContent.
      if (pm.presetId === 'count-up') {
        const targetText = partEl.textContent ?? '0'
        const targetValue = parseFloat(targetText.replace(/[^0-9.\-]/g, '')) || 0
        const isInteger = Number.isInteger(targetValue)
        const prefix = targetText.match(/^[^0-9.\-]*/)?.[0] ?? ''
        const suffix = targetText.match(/[^0-9.]*$/)?.[0] ?? ''

        driver.play(partEl as HTMLElement, pm.keyframes, {
          duration: pm.durationMs,
          delay: pm.delayMs,
          easing: pm.easing,
          fill: 'forwards',
          onUpdate: (progress: number) => {
            const current = targetValue * progress
            ;(partEl as HTMLElement).textContent = prefix + (isInteger ? Math.round(current).toString() : current.toFixed(1)) + suffix
          },
        })
      } else {
        driver.play(partEl as HTMLElement, pm.keyframes, {
          duration: pm.durationMs,
          delay: pm.delayMs,
          easing: pm.easing,
          fill: 'forwards',
        })
      }
    })
  }
}
