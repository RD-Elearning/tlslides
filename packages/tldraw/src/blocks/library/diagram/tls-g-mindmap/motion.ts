/**
 * Motion for tls.g.mindmap — the centre first, then each branch with its link and sub-topics.
 *
 * RV08: `sweep-nodes` (opacity, staggered). `grow-branches` chains `draw-path` (a no-op on these
 * strokes under GSAP, S14); the sub-topic part was `child[*]` while the layout emits `child[i][j]`.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['center', 'center.label', 'link[*]', 'branch[*]', 'branch[*].label', 'link[*][*]', 'child[*][*]', 'child[*][*].label'],
  preset: 'sweep-nodes',
}
