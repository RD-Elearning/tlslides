/**
 * Motion recipe for tls.m.decoration — the shape fades in as a field.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['shape'],
  preset: 'field-in',
}
