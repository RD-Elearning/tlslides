/**
 * Motion recipe for tls.t.tags — tags appear one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['tag[*]', 'tag[*].label'],
  preset: 'stagger-children',
}
