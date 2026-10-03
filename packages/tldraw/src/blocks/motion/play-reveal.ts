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
 * The DOM elements one recipe part addresses, and whether they came from an indexed match.
 *
 * 1. Exact `data-part="<name>"` matches (the pre-P7 behaviour, unchanged).
 * 2. Otherwise (P7) the part's indexed elements: `bar` matches `bar/0`, `bar/1`…; a glob such
 *    as `item[*].text` matches `item[0].text`, `item[1].text`…. Layouts emit indexed parts while
 *    recipes name the family, so without this most part choreography never found an element.
 */
export function partElements(el: HTMLElement, partName: string): { els: HTMLElement[]; indexed: boolean } {
  const exact = Array.from(el.querySelectorAll<HTMLElement>(`[data-part="${cssEscapeAttr(partName)}"]`))
  if (exact.length > 0) return { els: exact, indexed: false }
  const all = Array.from(el.querySelectorAll<HTMLElement>('[data-part]'))
  let match: (p: string) => boolean
  if (partName.includes('[*]')) {
    const re = new RegExp('^' + partName.split('[*]').map(escapeRegExp).join('\\[\\d+\\]') + '$')
    match = (p) => re.test(p)
  } else {
    match = (p) => p.startsWith(partName + '/') || (p.startsWith(partName) && /^\[\d+\]/.test(p.slice(partName.length)))
  }
  return { els: all.filter((n) => match(n.getAttribute('data-part') ?? '')), indexed: true }
}

/** The element whose text a count-up may rewrite: follow single-child chains down to a leaf
 *  that holds a digit; `undefined` for anything else (no number, or several children). */
function countTarget(el: HTMLElement): HTMLElement | undefined {
  let target: Element = el
  while (target.children.length === 1) target = target.children[0]
  if (target.children.length > 0) return undefined
  return /\d/.test(target.textContent ?? '') ? (target as HTMLElement) : undefined
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cssEscapeAttr(s: string): string {
  return s.replace(/["\\]/g, '\\$&')
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
      for (const partEl of partElements(el, pm.partName).els) {
        driver.set(partEl, { opacity: 1, translate: '0px 0px', scale: 1 })
      }
    }
    return
  }

  // 3. Set hidden state on ALL parts synchronously, before the block becomes visible.
  //    Parts are children of `el`, so they're invisible while the block is at opacity: 0.
  for (const pm of partMotions) {
    for (const partEl of partElements(el, pm.partName).els) {
      driver.set(partEl, hiddenStateFromKeyframes(pm.keyframes))
    }
  }

  // 4. Set hidden state on the block container.
  driver.set(el, blockHiddenState(blockMotion.effect))

  // 5. Build block-level keyframes and play. Easing now comes from the resolved motion
  //    (spec/definition/preset), so a persisted shape easing reaches the driver.
  const blockKeyframes = blockEntranceKeyframes(blockMotion.effect)

  driver.play(el, blockKeyframes, {
    duration: blockMotion.durationMs,
    delay: blockMotion.delayMs,
    easing: blockMotion.easing,
    fill: 'forwards',
  })

  // 6. Play part-level animations with stagger.
  for (const pm of partMotions) {
    const { els: partEls, indexed } = partElements(el, pm.partName)
    partEls.forEach((partEl, elementIndex) => {
      // P7: indexed elements of one part stagger by the preset's step (exact matches keep
      // the part's own delay, as before).
      const delay = pm.delayMs + (indexed ? elementIndex * (pm.staggerMs ?? 0) : 0)
      // Count-up: intercept onUpdate to tween textContent.
      // P7: count on the single text leaf inside the part (a one-line text part renders as
      // part > line div). A label with no digit ("Adoption" used to become "Adoption0Adoption")
      // and a part with several children (a tile group, a wrapped paragraph) are never rewritten,
      // and the last frame restores the exact original text ("1,250" would otherwise end "1250").
      const countEl = countTarget(partEl as HTMLElement)
      if (pm.presetId === 'count-up' && countEl) {
        const targetText = countEl.textContent ?? '0'
        const targetValue = parseFloat(targetText.replace(/[^0-9.-]/g, '')) || 0
        const isInteger = Number.isInteger(targetValue)
        const prefix = targetText.match(/^[^0-9.-]*/)?.[0] ?? ''
        const suffix = targetText.match(/[^0-9.]*$/)?.[0] ?? ''

        driver.play(partEl as HTMLElement, pm.keyframes, {
          duration: pm.durationMs,
          delay,
          easing: pm.easing,
          fill: 'forwards',
          onUpdate: (progress: number) => {
            if (progress >= 1) {
              countEl.textContent = targetText
              return
            }
            const current = targetValue * progress
            countEl.textContent = prefix + (isInteger ? Math.round(current).toString() : current.toFixed(1)) + suffix
          },
        })
      } else {
        driver.play(partEl as HTMLElement, pm.keyframes, {
          duration: pm.durationMs,
          delay,
          easing: pm.easing,
          fill: 'forwards',
        })
      }
    })
  }
}
