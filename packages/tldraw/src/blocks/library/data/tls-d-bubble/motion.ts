/**
 * Motion recipe for tls.d.bubble — bubbles pop in.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['point[*]'],
  preset: 'pop-points',
}
