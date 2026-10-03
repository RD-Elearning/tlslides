/**
 * Motion recipe for tls.m.icon-list — staggered line reveal.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['iconbg[*]', 'icon[*]', 'title[*]', 'text[*]'],
  preset: 'stagger-lines',
}
