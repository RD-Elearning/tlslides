/**
 * Motion for tls.g.iceberg — the tip, the water, then what is below.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['above', 'water', 'below'],
  preset: 'reveal-down',
}
