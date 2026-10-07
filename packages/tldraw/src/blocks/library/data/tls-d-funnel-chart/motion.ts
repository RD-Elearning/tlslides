/**
 * Motion recipe for tls.d.funnel-chart — the stages pour in from the top, one row at a time; each
 * row's name and value follow its stage (the value counts up), and the drop-off between two stages
 * appears once the lower stage is in.
 *
 * RVM3: names, values and drop-offs used to ride the block fade, so they showed before their stage.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARKS_AT } from '../_chart/motion'

const ROW = 120

export const motion: MotionRecipe = {
  parts: ['stage[*]', 'stage[*].label', 'stage[*].value', 'dropoff[*]'],
  preset: 'stagger-children',
  partMotion: {
    'stage[*]': { preset: 'fade-down', delay: MARKS_AT, stagger: ROW },
    'stage[*].label': { preset: 'sweep-nodes', delay: MARKS_AT + 150, stagger: ROW },
    'stage[*].value': { preset: 'count-up', delay: MARKS_AT + 150, stagger: ROW },
    // dropoff[i] sits between stage i-1 and stage i; the first one belongs to stage 1
    'dropoff[*]': { preset: 'sweep-nodes', delay: MARKS_AT + ROW + LABEL_AFTER, stagger: ROW },
  },
}
