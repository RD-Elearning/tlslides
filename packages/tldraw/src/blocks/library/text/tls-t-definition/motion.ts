/**
 * Motion recipe for tls.t.definition — term first, then the body.
 *
 * `title-then-body` is a chained preset and the engine does not play chains, so every part rose at
 * once. Under `motionStyle: expressive` the parts stagger in reading order instead (RVM2): term,
 * pronunciation, meta, definition, example bar, example.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['term', 'pronunciation', 'meta', 'definition', 'example.bar', 'example'],
  preset: 'title-then-body',
  expressive: 'stagger-children',
}
