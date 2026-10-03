/**
 * Motion for tls.g.tree — branches grow outward from the root.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['link[*]', 'node[*]'],
  preset: 'grow-branches',
}
