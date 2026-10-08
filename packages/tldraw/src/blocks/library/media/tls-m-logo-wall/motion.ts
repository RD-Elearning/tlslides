/**
 * Motion recipe for tls.m.logo-wall — calm brand furniture: the heading fades in, then the logos
 * fade in in place in reading order, 60 ms apart (twelve logos in about 1.2 s).
 *
 * RVM5: was `stagger-grid` (every logo slid up 24 px; optional plates and dividers were in no part).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['heading', 'logo[*]', 'plate[*]', 'divider[*]'],
  preset: 'stagger-grid',
  partMotion: {
    heading: { preset: 'sweep-nodes', delay: 0, stagger: 0 },
    'logo[*]': { preset: 'sweep-nodes', delay: 120, stagger: 60 },
    // optional plates come with their logo; the hairline dividers are furniture and fade together
    'plate[*]': { preset: 'sweep-nodes', delay: 120, stagger: 60 },
    'divider[*]': { preset: 'sweep-nodes', delay: 120, stagger: 0 },
  },
}
