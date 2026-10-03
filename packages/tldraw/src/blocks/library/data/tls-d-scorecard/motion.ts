/**
 * Motion recipe for tls.d.scorecard — rows reveal one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['row[*]'],
  preset: 'stagger-lines',
}
