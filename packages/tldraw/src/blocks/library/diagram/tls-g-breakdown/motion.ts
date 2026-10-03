/**
 * Motion for tls.g.breakdown — the whole, then the parts one by one.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['whole', 'bracket', 'part[*]'],
  preset: 'stagger-children',
}
