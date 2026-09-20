/**
 * Motion recipe for tls.c.image-text — staggered entrance.
 *
 * Parts: image, kicker, title, body. The default preset fades in the image
 * first, then the text parts stagger below.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['image', 'kicker', 'title', 'body'],
  preset: 'fade-up',
}
