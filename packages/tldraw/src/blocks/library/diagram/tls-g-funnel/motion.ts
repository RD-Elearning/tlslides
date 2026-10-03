/**
 * Motion for tls.g.funnel — stages appear one after another from the widest.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['stage[*]', 'note[*]'],
  preset: 'stagger-children',
}
