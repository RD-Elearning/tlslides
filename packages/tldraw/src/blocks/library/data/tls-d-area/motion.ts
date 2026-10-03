/**
 * Motion recipe for tls.d.area — areas wipe in from the left.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['area[*]'],
  preset: 'wipe-x',
}
