/**
 * Motion recipe for tls.t.footnote — quiet fade-up. (A recipe carries no duration field, so the
 * "low default duration" is left to the preset and the per-instance `motion.duration`.)
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['item[*]'],
  preset: 'fade-up',
}
