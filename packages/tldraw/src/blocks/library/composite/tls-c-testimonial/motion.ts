/**
 * Motion recipe for tls.c.testimonial — word-by-word quote reveal with staggered attribution.
 */

import type { MotionRecipe } from '../../../types'
import { TESTIMONIAL_MS } from './animate'

export const motion: MotionRecipe = {
  parts: ['quote', 'avatar', 'name', 'role'],
  preset: 'fade-up',
  expressiveMs: TESTIMONIAL_MS,
}
