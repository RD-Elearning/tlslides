/**
 * Motion recipe for tls.t.callout — fade-up as one unit.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['box', 'icon', 'title', 'text'],
  preset: 'fade-up',
}
