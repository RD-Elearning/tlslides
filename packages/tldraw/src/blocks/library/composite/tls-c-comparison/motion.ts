/**
 * Motion recipe for tls.c.comparison — staggered column/item reveal.
 *
 * Parts use wildcard patterns so the motion system can target all columns
 * and their items. The default preset is 'stagger-lines' which staggers
 * each part by index — appropriate for a column-by-column reveal.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['col[*].title', 'col[*].item[*]'],
  preset: 'stagger-lines',
}
