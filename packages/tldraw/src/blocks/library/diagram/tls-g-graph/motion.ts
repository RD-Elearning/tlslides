/** Motion for tls.g.graph — the nodes appear, the edges draw on, then the visit order counts in. */

import type { MotionRecipe } from '../../../types'
import { STEP, WIRE_AFTER } from '../_motion'

export const motion: MotionRecipe = {
  parts: ['node[*]', 'label[*]', 'edge[*]', 'order[*]', 'sequence', 'head', 'null'],
  preset: 'sweep-nodes',
  partMotion: {
    'edge[*]': { preset: 'draw-path', delay: WIRE_AFTER, stagger: STEP / 4 },
    'order[*]': { preset: 'fade-up', delay: WIRE_AFTER * 2, stagger: STEP / 2 },
  },
}
