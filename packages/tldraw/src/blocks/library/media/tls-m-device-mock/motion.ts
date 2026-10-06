/**
 * Motion recipe for tls.m.device-mock — fades up as one unit.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['frame.shadow', 'frame', 'frame.dot[*]', 'frame.address', 'frame.url', 'screen'],
  preset: 'fade-up',
}
