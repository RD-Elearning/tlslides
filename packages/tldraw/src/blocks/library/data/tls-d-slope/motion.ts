/**
 * Motion recipe for tls.d.slope — lines draw from left to right.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['line[*]'],
  preset: 'draw-path',
}
