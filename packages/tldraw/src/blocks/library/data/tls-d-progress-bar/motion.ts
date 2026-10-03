/**
 * Motion recipe for tls.d.progress-bar — fills grow from the left edge.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['row[*].fill'],
  preset: 'grow-bars-x',
}
