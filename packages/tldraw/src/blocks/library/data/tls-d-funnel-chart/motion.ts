/**
 * Motion recipe for tls.d.funnel-chart — stages appear top to bottom.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['stage[*]', 'dropoff[*]'],
  preset: 'stagger-children',
}
