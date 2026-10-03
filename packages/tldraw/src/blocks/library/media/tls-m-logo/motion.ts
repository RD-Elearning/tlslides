/**
 * Motion recipe for tls.m.logo — fades up.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['logo', 'logo.plate'],
  preset: 'fade-up',
}
