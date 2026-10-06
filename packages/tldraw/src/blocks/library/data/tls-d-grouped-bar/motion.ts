/**
 * Motion recipe for tls.d.grouped-bar — bars grow from the baseline.
 */

import type { MotionRecipe } from '../../../types'

// RV05: `stagger-children` fades each bar in while it rises 12 units, one after another. The `grow-bars-*` presets scale about the element centre (bars floated and inflated) and the `wipe-*`/`mask-reveal` presets snap under the GSAP driver (their clip-path keyframes differ in value count, so GSAP cannot interpolate them): shared issues Y1 and Y4.
export const motion: MotionRecipe = {
  parts: ['bar[*][*]'],
  preset: 'stagger-children',
}
