/**
 * Motion for tls.g.roadmap — bars grow along the time axis.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['bar[*]'],
  preset: 'grow-bars-x',
}
