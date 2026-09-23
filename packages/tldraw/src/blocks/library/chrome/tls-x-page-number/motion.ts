/**
 * Motion recipe for tls.x.page-number — page number chrome.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: 'easeOut' },
}