/**
 * Motion for tls.g.iceberg — the water band washes down from the waterline, the visible tip rises
 * out of it, then the hidden part is revealed downwards below the surface.
 *
 * RVM3: all three parts played `reveal-down` at once; now they follow one another (the J5 stagger
 * cap is per item of a family; these are three different parts).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['above', 'water', 'below'],
  preset: 'reveal-down',
  partMotion: {
    water: { preset: 'wipe-down', delay: 0 },
    above: { preset: 'fade-up', delay: 120 },
    below: { preset: 'reveal-down', delay: 300 },
  },
}
