/**
 * Motion recipe for tls.m.logo-wall — logos appear in grid order.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['heading', 'logo[*]'],
  preset: 'stagger-grid',
}
