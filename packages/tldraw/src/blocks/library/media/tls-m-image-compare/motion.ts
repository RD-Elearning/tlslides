/**
 * Motion recipe for tls.m.image-compare — a horizontal wipe.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['before', 'after', 'divider'],
  preset: 'wipe-x',
}
