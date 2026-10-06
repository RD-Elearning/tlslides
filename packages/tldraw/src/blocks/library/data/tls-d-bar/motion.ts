/**
 * Motion recipe for tls.d.bar — the bars appear left to right, each rising a little as it fades in.
 *
 * RV05: `stagger-children` (opacity + a 12 unit rise, staggered). The `grow-bars-*` presets scale about
 * the element centre, so bars floated and inflated from their middle (shared issue Y1), and the
 * `wipe-*` presets snap under the GSAP driver the viewer uses (shared issue Y4).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['title', 'bar[*][*]'],
  preset: 'stagger-children',
}
