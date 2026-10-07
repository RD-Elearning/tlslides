/**
 * Motion recipe for tls.c.hero — kicker, title, subtitle, CTA in a clear hierarchy (`HERO_AT` in
 * index.ts); `expressiveMs` lets the next block wait for the whole timeline (RVM5).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['kicker', 'title', 'subtitle', 'cta'],
  preset: 'fade-up',
  expressiveMs: 1400,
}
