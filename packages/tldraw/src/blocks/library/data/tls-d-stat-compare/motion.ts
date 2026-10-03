/**
 * Motion recipe for tls.d.stat-compare — the numbers count up.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['left.value', 'connector', 'right.value', 'delta', 'caption'],
  preset: 'count-up',
}
