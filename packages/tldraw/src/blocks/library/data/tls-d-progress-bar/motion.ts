/**
 * Motion recipe for tls.d.progress-bar — fills grow from the left edge.
 */

import type { MotionRecipe } from '../../../types'

// RV05: `sweep-nodes` fades the marks in one after another, in reading order. The scale/clip/dash presets either scale about the element centre (Y1) or do not interpolate under the GSAP driver (Y4), and `draw-path` does nothing on these paths.
export const motion: MotionRecipe = {
  parts: ['row[*].fill'],
  preset: 'sweep-nodes',
}
