/**
 * Motion recipe for tls.m.avatar-group — avatars pop in one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['avatar[*]', 'more', 'caption'],
  preset: 'stagger-children',
}
