/**
 * Motion recipe for tls.t.marker — the marker (disc and number together) fades up; under
 * `motionStyle: expressive` it pops in (scale .98 → 1, a light bounce).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['marker'],
  preset: 'fade-up',
  expressive: 'pop',
}
