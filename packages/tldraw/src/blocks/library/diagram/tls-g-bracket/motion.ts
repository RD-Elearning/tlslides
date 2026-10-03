/**
 * Motion for tls.g.bracket — the items appear, then the brace draws in, then the label.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['items', 'brace', 'label'],
  preset: 'draw-path',
}
