/**
 * Motion recipe for tls.m.icon-label — the icon rises in, its label follows a beat later.
 *
 * RVM5: icon and label rose together.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['icon', 'label'],
  preset: 'fade-up',
  partMotion: {
    icon: { preset: 'fade-up', delay: 0 },
    label: { preset: 'fade-up', delay: 120, stagger: 60 },
  },
}
