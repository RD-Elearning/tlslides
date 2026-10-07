/**
 * Motion recipe for tls.c.kpi-row — staggered tile reveal.
 *
 * Parts listed here must match exactly what layout() emits via data-part.
 * The `tile[*]` wildcard covers `tile/0`, `tile/1`, etc.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  // RVM3: the tiles rise in left to right and every tile's value counts up (the tiles' `value`
  // parts, matched by name); labels and deltas arrive with their tile.
  parts: ['tile[*]', 'value'],
  preset: 'stagger-children',
  partMotion: {
    'tile[*]': { preset: 'fade-up', delay: 0, stagger: 100 },
    value: { preset: 'count-up', delay: 120 },
  },
}
