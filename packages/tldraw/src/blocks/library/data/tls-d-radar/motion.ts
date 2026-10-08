/**
 * Motion recipe for tls.d.radar — each series outline draws on from its first axis (12 o'clock)
 * clockwise round the web, its tinted area fades in behind it as the outline closes, and the vertex
 * dots pop in. The web, spokes and axis labels ride the block fade.
 *
 * RVM3: back to `draw-path` (a real stroke draw-on since M1); RV05 had switched to a plain fade.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARKS_AT } from '../_chart/motion'

const SERIES = 120

export const motion: MotionRecipe = {
  parts: ['series[*]', 'series[*].area', 'series[*].dot[*]'],
  preset: 'stagger-children',
  partMotion: {
    'series[*]': { preset: 'draw-path', delay: MARKS_AT, stagger: SERIES },
    'series[*].area': { preset: 'sweep-nodes', delay: MARKS_AT + 200, stagger: SERIES },
    'series[*].dot[*]': { preset: 'field-in', delay: MARKS_AT + LABEL_AFTER, stagger: 30 },
  },
}
