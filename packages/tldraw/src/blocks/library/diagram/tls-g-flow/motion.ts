/**
 * Motion for tls.g.flow — nodes and edges appear one after another, in layer order.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['node[*]', 'edge[*]'],
  preset: 'stagger-children',
}
