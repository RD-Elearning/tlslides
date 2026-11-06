/**
 * Motion recipe for tls.m.backdrop — the ground never moves in the build (S15 adds viewer-only drift).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['backdrop'],
  preset: 'none',
}
