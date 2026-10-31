/**
 * Motion for tls.m.icon-cluster — the icons pop in one after another, the dots follow; in the
 * viewer (vivid V2) each icon then bobs gently out of step with the others.
 */

import type { AmbientRecipe, MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['icon[*]', 'dots'],
  preset: 'pop-points',
  partMotion: {
    'icon[*]': { preset: 'pop-points', delay: 0, stagger: 110 },
    dots: { preset: 'fade', delay: 380 },
  },
  ambient: (props): AmbientRecipe | null => (props.ambient === 'none' ? null : { preset: 'bob', part: 'icon', stagger: 420 }),
}
