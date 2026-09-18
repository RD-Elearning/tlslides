/**
 * Motion recipe for tls.t.hero-number — default is count-up.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  preset: 'count-up',
  parts: ['value', 'unit', 'caption'],
}
