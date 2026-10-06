/**
 * Motion for tls.g.tree — nodes appear top-down in tree order, each followed by the link to it.
 *
 * RV08: `sweep-nodes` (opacity, staggered). `grow-branches` chains `draw-path`, a no-op on these
 * strokes under GSAP (S14). Node and link leaves keep their id-path names (`node[0-1]`); the numbered
 * groups `item[k]` / `edge[k]` are what the recipe targets, because the part matcher needs digits.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['item[*]', 'edge[*]'],
  preset: 'sweep-nodes',
}
