/**
 * Motion recipe for tls.d.radar — the shapes draw on.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['series[*]'],
  preset: 'draw-path',
}
