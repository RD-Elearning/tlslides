/**
 * Motion recipe for tls.m.pattern — a background texture: static by default; a preset only when
 * set explicitly on the instance.
 *
 * `preset: 'none'` keeps it static under every slide `motionStyle` too (RVM2): without it the
 * pattern rose 24 px under `expressive` and held a step of the build chain.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['pattern'],
  preset: 'none',
}
