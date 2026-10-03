/**
 * Motion for tls.g.matrix-2x2 — axes draw first, then the quadrants and points appear.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['axes', 'q[*]', 'item[*]'],
  preset: 'draw-axis-then-nodes',
}
