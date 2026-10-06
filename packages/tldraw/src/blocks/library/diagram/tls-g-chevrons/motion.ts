/**
 * Motion for tls.g.chevrons — the segments appear left to right, each label following its chevron.
 *
 * RV07: `sweep-nodes` (opacity, staggered by index). The old `wipe-x` pairs `inset(0 100% 0 0)` with
 * `inset(0)` and GSAP cannot interpolate unequal terms, so the row stayed hidden and snapped in at
 * the end (shared issue S16).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['chevron[*]', 'label[*]', 'text[*]'],
  preset: 'sweep-nodes',
}
