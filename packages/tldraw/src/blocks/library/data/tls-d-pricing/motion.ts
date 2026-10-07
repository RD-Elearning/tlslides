/**
 * Motion recipe for tls.d.pricing — the plan cards rise in side by side, left to right,
 * each price counting up as its card arrives (a plan whose price has no digits, "Free", just fades).
 *
 * RVM3: stagger 40 -> 120 ms, so the cards read as one after another; the price counts.
 */

import type { MotionRecipe } from '../../../types'

const CARD = 120

export const motion: MotionRecipe = {
  parts: ['plan[*]', 'price[*]'],
  preset: 'stagger-children',
  partMotion: {
    'plan[*]': { preset: 'fade-up', delay: 0, stagger: CARD },
    'price[*]': { preset: 'count-up', delay: 100, stagger: CARD },
  },
}
