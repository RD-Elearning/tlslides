/**
 * Motion for tls.g.bracket — the items, then the brace, then its label.
 *
 * RV08: `draw-path` does nothing on a filled path under GSAP (S14); `sweep-nodes` fades the three groups in order.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['items', 'brace', 'label'],
  preset: 'sweep-nodes',
}
