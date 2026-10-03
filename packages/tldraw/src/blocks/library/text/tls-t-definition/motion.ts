/**
 * Motion recipe for tls.t.definition — term first, then the body.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['term', 'pronunciation', 'meta', 'definition', 'example.bar', 'example'],
  preset: 'title-then-body',
}
