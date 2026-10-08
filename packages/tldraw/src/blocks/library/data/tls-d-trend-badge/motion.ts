/**
 * Motion recipe for tls.d.trend-badge — the pill fades up with its arrow, figure and label.
 *
 * Under `motionStyle: expressive` the pill pops in, the arrow and the change figure (counting up)
 * follow, then the label. RVM3: the arrow, figure and label were not listed, so they rode the
 * block fade and showed before the pill.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['badge', 'badge.arrow', 'badge.text', 'badge.label'],
  preset: 'fade-up',
  expressive: 'stagger-children',
  partMotion: {
    badge: { preset: 'field-in', delay: 0 },
    'badge.arrow': { preset: 'sweep-nodes', delay: 80 },
    'badge.text': { preset: 'count-up', delay: 80 },
    'badge.label': { preset: 'fade-up', delay: 200 },
  },
}
