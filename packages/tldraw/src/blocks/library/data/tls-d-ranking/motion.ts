/**
 * Motion recipe for tls.d.ranking — rows reveal one after another.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['row[*].rank', 'row[*].label', 'row[*].bar', 'row[*].value'],
  preset: 'stagger-lines',
}
