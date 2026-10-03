/**
 * Motion for tls.g.venn — each set fades up in turn, then the overlap.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['set[*]', 'overlap'],
  preset: 'fade-up',
}
