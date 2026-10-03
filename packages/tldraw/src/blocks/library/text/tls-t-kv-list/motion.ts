/**
 * Motion recipe for tls.t.kv-list — staggered line reveal.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['key[*]', 'leader[*]', 'value[*]', 'rule[*]'],
  preset: 'stagger-lines',
}
