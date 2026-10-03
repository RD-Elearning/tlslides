/**
 * Motion recipe for tls.d.table — rows reveal one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['row[*]', 'footer'],
  preset: 'stagger-lines',
}
