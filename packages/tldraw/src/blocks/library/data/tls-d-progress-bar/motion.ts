/**
 * Motion recipe for tls.d.progress-bar — row by row, each fill grows from the start of its track
 * while its percentage counts up beside it. Labels and tracks ride the block fade.
 *
 * RVM3: back to `grow-bars-x` (M1: one axis, from the start edge); RV04 had switched to
 * `sweep-nodes` because the old grow scaled about the bar's centre.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { MARKS_AT, ROW_STAGGER } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['row[*].fill', 'row[*].value'],
  preset: 'stagger-children',
  partMotion: {
    'row[*].fill': { preset: 'grow-bars-x', delay: MARKS_AT, stagger: ROW_STAGGER },
    'row[*].value': { preset: 'count-up', delay: MARKS_AT, stagger: ROW_STAGGER },
  },
}
