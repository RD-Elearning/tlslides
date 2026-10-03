/**
 * Motion recipe for tls.d.grouped-bar — bars grow from the baseline.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['bar[*][*]'],
  preset: 'grow-bars-y',
}
