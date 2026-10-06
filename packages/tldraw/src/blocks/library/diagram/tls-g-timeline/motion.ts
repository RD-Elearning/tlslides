/**
 * Motion for tls.g.timeline — the axis draws first, then the nodes and cards follow.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  // RV07: `draw-axis-then-nodes` chains `draw-path` (a no-op on the axis rect, S14) and a rise; `sweep-nodes`
  // fades the axis in, then nodes, stems and cards left to right.
  parts: ['axis', 'axis.progress', 'node[*]', 'stem[*]', 'date[*]', 'title[*]', 'text[*]'],
  preset: 'sweep-nodes',
}
