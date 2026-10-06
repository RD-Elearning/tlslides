/**
 * Motion recipe for tls.m.avatar-group — avatars pop in one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['avatar[*].edge', 'avatar[*]', 'avatar[*].initials[*]', 'more', 'more.disc', 'more.label', 'caption'],
  preset: 'stagger-children',
}
