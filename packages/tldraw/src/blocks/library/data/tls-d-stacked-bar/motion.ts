/**
 * Motion recipe for tls.d.stacked-bar — segments grow in.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['seg[*][*]', 'total[*]'],
  preset: 'grow-segments',
}
