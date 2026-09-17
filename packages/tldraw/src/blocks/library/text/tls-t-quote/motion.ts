/**
 * Motion recipe for tls.t.quote — default is quote-in.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  preset: 'quote-in',
  parts: ['glyph', 'text', 'attribution'],
}
