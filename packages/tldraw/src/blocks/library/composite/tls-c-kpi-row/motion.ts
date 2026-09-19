/**
 * Motion recipe for tls.c.kpi-row — staggered tile reveal.
 *
 * Parts listed here must match exactly what layout() emits via data-part.
 * The `tile[*]` wildcard covers `tile/0`, `tile/1`, etc.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['tile[*]'],
  preset: 'stagger-children',
}
