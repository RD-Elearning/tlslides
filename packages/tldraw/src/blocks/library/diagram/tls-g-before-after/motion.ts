/**
 * Motion for tls.g.before-after — the two panels slide in from their sides.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['before', 'arrow', 'after'],
  preset: 'split-in',
}
