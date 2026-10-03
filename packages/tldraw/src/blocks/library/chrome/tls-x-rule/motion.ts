/**
 * Motion recipe for tls.x.rule — the line wipes in from the start. (A recipe is static: a vertical
 * rule also gets `wipe-x`; set `motion.preset: 'wipe-y'` on the instance for a vertical wipe.)
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['rule'],
  preset: 'wipe-x',
}
