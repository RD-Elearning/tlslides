/**
 * Motion for tls.g.funnel — stages appear one after another from the widest, each with its label, note and leader.
 *
 * RV08: labels and leaders were not parts.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['stage[*]', 'label[*]', 'note[*]', 'leader[*]'],
  preset: 'stagger-children',
}
