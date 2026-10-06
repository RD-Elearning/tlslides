/**
 * Motion recipe for tls.d.stat-compare — the two numbers and the change count up.
 *
 * Only numeric parts are listed: the count-up preset rewrites the digits of every part it is
 * applied to, so a caption such as "Q3 2024" would have counted too. Under `motionStyle: subtle`
 * (and by default) the block fades up with its numbers already final.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['left.value', 'right.value', 'delta', 'delta.text'],
  preset: 'fade-up',
  expressive: 'count-up',
}
