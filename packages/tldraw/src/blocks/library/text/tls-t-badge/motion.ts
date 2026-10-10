/**
 * Motion recipe for tls.t.badge — the pill (one part: fill, icon and label together) fades up;
 * under `motionStyle: expressive` it pops in (scale .98 → 1, a light bounce).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['badge'],
  preset: 'fade-up',
  expressive: 'pop',
}
