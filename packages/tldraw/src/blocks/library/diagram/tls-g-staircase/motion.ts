/**
 * Motion for tls.g.staircase — the steps rise from the floor one `STEP` apart, lowest first, each
 * with its number; the icon, label and note come once their step is up; the stair line draws
 * along the tops last.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

export const motion: MotionRecipe = {
  parts: ['rise[*]', 'cap[*]', 'stair'],
  preset: 'stagger-children',
  partMotion: {
    'rise[*]': { preset: 'grow-bars-y', origin: '50% 100%', delay: 0, stagger: STEP * 1.5 },
    'cap[*]': { preset: 'sweep-nodes', delay: LABEL_AFTER + 120, stagger: STEP * 1.5 },
    stair: { preset: 'draw-path', delay: STEP * 1.5 * 3 + 200 },
  },
}
