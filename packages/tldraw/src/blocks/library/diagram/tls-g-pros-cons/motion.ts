/**
 * Motion for tls.g.pros-cons — the two columns split in, then the verdict.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['pros', 'cons', 'verdict'],
  preset: 'split-in',
}
