/**
 * Motion recipe for tls.d.waterfall — bars step in left to right.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['bar[*]', 'connector[*]'],
  preset: 'stagger-children',
}
