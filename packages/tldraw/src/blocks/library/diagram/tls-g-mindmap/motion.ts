/**
 * Motion for tls.g.mindmap — the centre first, then branches grow outward.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['center', 'link[*]', 'branch[*]', 'child[*]'],
  preset: 'grow-branches',
}
