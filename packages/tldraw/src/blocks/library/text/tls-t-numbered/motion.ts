/**
 * Motion recipe for tls.t.numbered — staggered line reveal.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['item[*].badge', 'item[*].marker', 'item[*].text'],
  preset: 'stagger-lines',
}
