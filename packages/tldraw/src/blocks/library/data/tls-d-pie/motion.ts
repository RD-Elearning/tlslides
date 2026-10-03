/**
 * Motion recipe for tls.d.pie — slices grow in one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['slice[*]', 'label[*]'],
  preset: 'grow-segments',
}
