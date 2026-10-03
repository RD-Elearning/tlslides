/**
 * Motion for tls.g.arrow — the arrow draws itself.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['arrow', 'label'],
  preset: 'draw-path',
}
