/**
 * Motion recipe for tls.m.icon-label.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: 'easeOut' },
}