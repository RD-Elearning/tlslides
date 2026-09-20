/**
 * Motion recipe for tls.t.bullets — staggered line reveal.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['item[*].marker', 'item[*].text'],
  preset: 'stagger-lines',
}
