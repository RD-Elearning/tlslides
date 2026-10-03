/**
 * Motion recipe for tls.d.progress-ring — the arc draws on (there is no `sweep` preset).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['arc', 'value', 'label', 'caption'],
  preset: 'grow-segments',
}
