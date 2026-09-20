/**
 * Motion recipe for tls.c.big-stat — count-up with easing, label slides in.
 *
 * Parts: value, label, context.
 * Easing is provided by the runtime; this recipe declares no easing.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['value', 'label', 'context'],
  preset: 'fade-up',
}
