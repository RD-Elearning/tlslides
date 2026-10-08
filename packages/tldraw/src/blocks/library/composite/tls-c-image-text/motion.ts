/**
 * Motion recipe for tls.c.image-text — the photo fades in calmly in place, then the text column
 * reads in: kicker, title, body, each rising a little after the one above it.
 *
 * RVM5: was `fade-up` on all four parts at once (the photo slid with the text).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['image', 'kicker', 'title', 'body'],
  preset: 'fade-up',
  partMotion: {
    image: { preset: 'sweep-nodes', delay: 0 },
    kicker: { preset: 'fade-up', delay: 150, stagger: 60 },
    title: { preset: 'fade-up', delay: 250, stagger: 60 },
    body: { preset: 'fade-up', delay: 420, stagger: 60 },
  },
}
