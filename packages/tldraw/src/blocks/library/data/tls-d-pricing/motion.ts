/**
 * Motion recipe for tls.d.pricing — cards appear one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['plan[*]'],
  preset: 'stagger-children',
}
