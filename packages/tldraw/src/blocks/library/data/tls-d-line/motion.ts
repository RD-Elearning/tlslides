/**
 * Motion recipe for tls.d.line — lines draw on from the left.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['series[*]', 'label[*]'],
  preset: 'draw-path',
}
