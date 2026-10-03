/**
 * Motion for tls.g.timeline — the axis draws first, then the nodes and cards follow.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['axis', 'node[*]', 'date[*]', 'title[*]', 'text[*]'],
  preset: 'draw-axis-then-nodes',
}
