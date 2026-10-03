/**
 * Motion recipe for tls.d.compare-table — rows reveal one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['row[*]'],
  preset: 'stagger-lines',
}
