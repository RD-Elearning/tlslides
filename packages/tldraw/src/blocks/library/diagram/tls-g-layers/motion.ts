/**
 * Motion for tls.g.layers — layers reveal from the top down.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['layer[*]', 'label[*]', 'note[*]', 'icon[*]'],
  preset: 'reveal-down',
}
