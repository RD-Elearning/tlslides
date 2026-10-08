/**
 * Motion recipe for tls.t.footnote — quiet fade-up. (A recipe carries no duration field, so the
 * "low default duration" is left to the preset and the per-instance `motion.duration`.)
 * Under `motionStyle: expressive` the notes stagger in one after the other (RVM2).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['item[*]'],
  preset: 'fade-up',
  expressive: 'stagger-children',
}
