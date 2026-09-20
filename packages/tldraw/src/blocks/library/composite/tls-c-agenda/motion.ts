/**
 * Motion recipe for tls.c.agenda - staggered item reveal.
 *
 * Parts use the item[*].index, item[*].title, item[*].note convention,
 * matching the tls.t.bullets pattern (item[*].marker, item[*].text).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['item[*].index', 'item[*].title', 'item[*].note'],
  preset: 'stagger-lines',
}
