/**
 * Motion for tls.g.cycle — nodes appear in rotational order.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['node[*]', 'arrow[*]'],
  preset: 'sweep-nodes',
}
