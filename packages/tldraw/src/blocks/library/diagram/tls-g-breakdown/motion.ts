import type { MotionRecipe } from '../../../types'
import { STEP } from '../_motion'

/**
 * Motion for tls.g.breakdown — the whole fades in, the brace draws on from its top end along its
 * length, and the parts follow it top-down one `STEP` apart.
 *
 * RVM4: the brace (a stroked path) faded with a rise instead of drawing.
 */
export const motion: MotionRecipe = {
  parts: ['whole', 'bracket', 'part[*]'],
  preset: 'stagger-children',
  partMotion: {
    whole: { preset: 'sweep-nodes', delay: 0 },
    bracket: { preset: 'draw-path', delay: 200 },
    'part[*]': { preset: 'stagger-children', delay: 320, stagger: STEP },
  },
}
