/**
 * Motion for tls.d.donut — donut chart with slice animation.
 *
 * Phase 6.1: Simple staggered fade-in for slices.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  preset: 'stagger-lines',
  parts: ['slice[0]', 'slice[1]', 'slice[2]', 'slice[3]', 'slice[4]'],
}