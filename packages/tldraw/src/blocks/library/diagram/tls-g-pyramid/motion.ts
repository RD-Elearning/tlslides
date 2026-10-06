/**
 * Motion for tls.g.pyramid — levels appear one after another, each with its label, leader and note.
 *
 * RV08: leaders and labels were not parts, so they were visible before their level.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['level[*]', 'label[*]', 'note[*]', 'leader[*]'],
  preset: 'stagger-children',
}
