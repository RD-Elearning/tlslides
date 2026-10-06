/**
 * Motion for tls.g.roadmap — the period header first, then lane by lane the bars with their labels.
 *
 * RV07: `stagger-children` (fade + a short rise). `grow-bars-x` scales a bar about its centre (S14) and
 * its part was `bar[*]` while the layout names bars `bar[lane][item]`, so nothing was targeted.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['period[*]', 'bar[*][*]', 'bar[*][*].label', 'legend[*]', 'legend[*].label'],
  preset: 'stagger-children',
}
