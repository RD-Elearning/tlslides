/**
 * Motion recipe for tls.m.device-mock — fades up as one unit.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['frame', 'screen'],
  preset: 'fade-up',
}
