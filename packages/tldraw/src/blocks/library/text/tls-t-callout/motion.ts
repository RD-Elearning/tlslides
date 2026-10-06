/**
 * Motion recipe for tls.t.callout — fade-up as one unit; under `motionStyle: expressive` the box
 * rises first and icon, title and text follow it in reading order (RVM2).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['box', 'icon', 'title', 'text'],
  preset: 'fade-up',
  expressive: 'stagger-children',
}
