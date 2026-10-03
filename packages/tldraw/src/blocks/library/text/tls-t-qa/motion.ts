/**
 * Motion recipe for tls.t.qa — staggered line reveal (all answers together).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['qmark[*].badge', 'qmark[*]', 'q[*]', 'amark[*].badge', 'amark[*]', 'a[*]'],
  preset: 'stagger-lines',
}
