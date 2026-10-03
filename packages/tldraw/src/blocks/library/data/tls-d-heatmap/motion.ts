/**
 * Motion recipe for tls.d.heatmap — cells appear in a staggered grid.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['cell[*]'],
  preset: 'stagger-grid',
}
