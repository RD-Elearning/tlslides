/**
 * Motion recipe for tls.l.field — a background: no default animation.
 *
 * `preset: 'none'` keeps it static under every slide `motionStyle` (RVM2): the content on top
 * animates, the field is already there. An explicit `motion.preset` on the instance still plays.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  preset: 'none',
}
