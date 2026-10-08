/**
 * Motion recipe for tls.c.feature-grid — staggered entrance with icon scale.
 */

import type { MotionRecipe } from '../../../types'

/**
 * The parts list must match the `data-part` attributes the template emits.
 * Uses the family form (`cell[*].icon`) to describe the repeating pattern.
 * The template emits concrete form (`cell[0].icon`, `cell[1].icon`, …).
 *
 * Parts: cell[i].icon, cell[i].title, cell[i].desc for i = 0..N-1.
 */
export const motion: MotionRecipe = {
  parts: [
    'cell[*].icon',
    'cell[*].title',
    'cell[*].desc',
  ],
  preset: 'fade-up',
}
