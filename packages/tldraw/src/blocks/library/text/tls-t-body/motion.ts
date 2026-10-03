/**
 * Motion recipe for tls.t.body — simple fade entrance.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['text'],
  preset: 'fade',
  /** P7: under `motionStyle: expressive` the paragraph rises in. */
  expressive: 'fade-up',
}
