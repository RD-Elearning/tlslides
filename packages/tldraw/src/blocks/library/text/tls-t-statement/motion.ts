/**
 * Motion recipe for tls.t.statement — words arrive in one by one.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['mark', 'text', 'text[*]', 'attribution'],
  preset: 'words-in',
}
