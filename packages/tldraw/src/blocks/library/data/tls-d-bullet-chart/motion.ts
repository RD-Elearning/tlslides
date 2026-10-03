/**
 * Motion recipe for tls.d.bullet-chart — value bars grow from the left.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['row[*].bar'],
  preset: 'grow-bars-x',
}
