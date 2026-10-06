/**
 * Motion recipe for tls.t.takeaway — default is fade-up.
 *
 * Under `motionStyle: expressive` the card surface fades in, the accent bar grows down from its top and
 * label, icon and text rise in after it (RVM2). It used to `pop`: the whole card scaled from 0.7
 * in under 100 ms (a 1440-wide card jumping ~200 px at its edges).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  preset: 'fade-up',
  parts: ['surface', 'accent-bar', 'label', 'icon', 'text'],
  expressive: 'stagger-children',
  partMotion: { surface: { preset: 'fade' }, 'accent-bar': { preset: 'grow-bars-y', origin: '50% 0%' } },
}
