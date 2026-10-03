/**
 * Motion recipe for tls.d.scatter — points pop in.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['point[*]', 'trend'],
  preset: 'pop-points',
}
