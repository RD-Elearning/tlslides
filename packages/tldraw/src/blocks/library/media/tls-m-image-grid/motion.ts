/**
 * Motion recipe for tls.m.image-grid — cells appear in grid order.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['img[*]', 'cap[*]'],
  preset: 'stagger-grid',
}
