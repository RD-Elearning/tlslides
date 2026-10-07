/**
 * Motion recipe for tls.d.stat-compare — the two numbers and the change count up.
 *
 * Only numeric parts are listed: the count-up preset rewrites the digits of every part it is
 * applied to, so a caption such as "Q3 2024" would have counted too. Under `motionStyle: subtle`
 * (and by default) the block fades up with its numbers already final.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['left.value', 'right.value', 'connector', 'delta', 'delta.text'],
  preset: 'fade-up',
  // RVM3: the expressive preset was `count-up` itself (the block zoomed in from 0.7 and the pill
  // counted with the numbers). Now the "before" number counts up, then the "after" number, the
  // connector draws across, and the change pill scales in with its figure counting (the pill plays
  // the same count-up entrance as its text; a bouncy pop settled in ~100 ms, under J5's 150).
  expressive: 'stagger-children',
  partMotion: {
    'left.value': { preset: 'count-up', delay: 0 },
    'right.value': { preset: 'count-up', delay: 150 },
    connector: { preset: 'wipe-x', delay: 220 },
    delta: { preset: 'count-up', delay: 420 },
    'delta.text': { preset: 'count-up', delay: 420 },
  },
}
