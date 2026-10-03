/**
 * Motion for tls.g.pyramid — levels appear one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['level[*]', 'label[*]', 'note[*]'],
  preset: 'stagger-children',
}
