/**
 * Motion recipe for tls.t.title — fade-up entrance.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['text', 'rule'],
  preset: 'fade-up',
  /** P7: under `motionStyle: expressive` the title rises in with a blur, word-reveal style. */
  expressive: 'words-in',
}
