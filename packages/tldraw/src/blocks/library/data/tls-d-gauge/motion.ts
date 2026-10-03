/**
 * Motion recipe for tls.d.gauge — the dial draws on, then the needle and value appear.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['bands[*]', 'needle', 'value', 'label'],
  preset: 'draw-path',
}
