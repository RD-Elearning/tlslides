/**
 * Motion recipe for tls.m.avatar — fades up as one unit.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['photo', 'name', 'role'],
  preset: 'fade-up',
}
