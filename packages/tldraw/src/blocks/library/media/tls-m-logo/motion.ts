/**
 * Motion recipe for tls.m.logo — brand furniture: the plate and the mark fade in together in
 * place, calmly (like chrome), nothing slides or scales.
 *
 * RVM5: was `fade-up` (the logo rose 24 px like content).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['logo', 'logo.plate'],
  preset: 'fade-up',
  partMotion: {
    'logo.plate': { preset: 'sweep-nodes', delay: 0 },
    logo: { preset: 'sweep-nodes', delay: 0 },
  },
}
