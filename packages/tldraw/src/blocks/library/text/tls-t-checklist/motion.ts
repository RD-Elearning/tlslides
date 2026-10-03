/**
 * Motion recipe for tls.t.checklist — staggered line reveal.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['item[*].mark', 'item[*].text', 'item[*].strike'],
  preset: 'stagger-lines',
}
