/**
 * Motion for tls.g.flow — nodes appear one after another in layer order, then each arrow with its
 * label (RV07: node parts are numeric so `node[*]` really matches; arrow heads and labels follow
 * their stem instead of sitting visible before it).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['node[*]', 'node[*].label', 'edge[*]', 'edge[*].head', 'edge[*].label'],
  preset: 'stagger-children',
}
