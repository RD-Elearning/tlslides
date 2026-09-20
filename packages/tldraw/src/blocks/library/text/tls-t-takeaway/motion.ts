/**
 * Motion recipe for tls.t.takeaway — default is fade-up.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  preset: 'fade-up',
  parts: ['accent-bar', 'label', 'icon', 'text'],
}
