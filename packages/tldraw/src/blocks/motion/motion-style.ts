/**
 * P7 — motion styles. Turns a slide's `motionStyle` (`static` | `subtle` | `expressive`) into a
 * concrete `BlockMotionSpec` for a block that has no own `motion`.
 *
 * Pure: no DOM, no React. `compileSlide` calls `styleBlockMotion` once per eligible block, in
 * reading order, and stores the result on the shape as `$block.styleMotion` (never as
 * `$block.motion`, so the authored spec round-trips unchanged).
 *
 * Precedence: block `motion` > slide `motionStyle` > deck `motionStyle` > nothing.
 */

import { AnimationTrigger } from '~types'
import type { BlockMotionSpec, MotionRecipe, MotionStyle } from '../types'
import { MOTION_STYLES } from '../types'
import { MOTION_PRESETS } from './presets'

/** Offset between blocks under `subtle`, in ms (reading order). */
export const SUBTLE_OFFSET_MS = 60
/** Upper bound on the `subtle` offset, so a busy slide still settles within ~0.6 s. */
export const SUBTLE_OFFSET_CAP_MS = 300

/** True when `value` is one of the three motion styles. */
export function isMotionStyle(value: unknown): value is MotionStyle {
  return typeof value === 'string' && (MOTION_STYLES as readonly string[]).includes(value)
}

/** The style that applies to a slide: the slide's own, else the deck's, else none. */
export function effectiveMotionStyle(
  slideStyle: unknown,
  deckStyle: unknown
): MotionStyle | undefined {
  if (isMotionStyle(slideStyle)) return slideStyle
  if (isMotionStyle(deckStyle)) return deckStyle
  return undefined
}

/**
 * The motion a style gives one block with no own `motion`.
 *
 * @param style   The slide's effective style.
 * @param recipe  The block definition's `MotionRecipe`.
 * @param index   The block's position in reading order among the styled blocks (0-based).
 * @returns A motion spec, or `undefined` when the block stays still (`static`, or a recipe whose
 *          preset is `none`, e.g. chrome).
 */
export function styleBlockMotion(
  style: MotionStyle | undefined,
  recipe: MotionRecipe | undefined,
  index: number
): BlockMotionSpec | undefined {
  if (!style || style === 'static') return undefined
  if (recipe?.preset === 'none') return undefined

  if (style === 'subtle') {
    return {
      preset: 'fade',
      trigger: AnimationTrigger.WithPrevious,
      order: 0,
      delay: Math.min(index * SUBTLE_OFFSET_MS, SUBTLE_OFFSET_CAP_MS),
    }
  }

  // expressive
  const wanted = recipe?.expressive ?? recipe?.preset
  const preset = wanted && wanted !== 'none' && MOTION_PRESETS[wanted] ? wanted : 'fade-up'
  const spec: BlockMotionSpec = {
    preset,
    trigger: index === 0 ? AnimationTrigger.WithPrevious : AnimationTrigger.AfterPrevious,
    order: index,
  }
  if (typeof recipe?.expressiveMs === 'number' && recipe.expressiveMs > 0) {
    spec.duration = recipe.expressiveMs
  }
  return spec
}

/** Reading order for two boxes: rows first (a 24-unit tolerance), then left to right. */
export function readingOrder(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  if (Math.abs(a.y - b.y) > 24) return a.y - b.y
  return a.x - b.x
}
