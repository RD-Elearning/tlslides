/**
 * Motion recipe for tls.t.hero-number.
 *
 * Only `value` is a listed part: the count-up preset rewrites the digits of every part it is
 * applied to, so listing `caption` ("FY2024 total") made it count 0 -> 2024 beside the number.
 * `unit` and `caption` arrive with the block's own entrance. Under `motionStyle: expressive` the
 * value counts up; `subtle` (and the default) is one calm fade-up, numbers already final.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['value'],
  preset: 'fade-up',
  expressive: 'count-up',
}
