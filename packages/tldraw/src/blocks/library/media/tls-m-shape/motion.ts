/**
 * Motion recipe for tls.m.shape — the shape (fill, icon and label together) fades up; under
 * `motionStyle: expressive` it pops in (scale .98 → 1, a light bounce).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['shape'],
  preset: 'fade-up',
  expressive: 'pop',
}
