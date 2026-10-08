/**
 * Motion recipe for tls.m.avatar — photo, then name, then role: the portrait (ring, gap, photo or
 * initials disc) fades in in place, the name rises in after it and the role last.
 *
 * RVM5: every part rose 24 px at once (the photo slid with the text).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['photo.ring', 'photo.gap', 'photo', 'photo.initials', 'name', 'role'],
  preset: 'fade-up',
  partMotion: {
    'photo.ring': { preset: 'sweep-nodes', delay: 0 },
    'photo.gap': { preset: 'sweep-nodes', delay: 0 },
    photo: { preset: 'sweep-nodes', delay: 0 },
    'photo.initials': { preset: 'sweep-nodes', delay: 0, stagger: 0 },
    name: { preset: 'fade-up', delay: 150, stagger: 60 },
    role: { preset: 'fade-up', delay: 260, stagger: 60 },
  },
}
