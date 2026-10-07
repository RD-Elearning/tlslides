/**
 * Motion recipe for tls.d.grouped-bar — the bars grow from the zero line, one series after the
 * other (along x in a horizontal chart: the engine follows the bars' geometry), and value labels
 * fade in once their bar is nearly grown. Axis, gridlines, legend and categories ride the block fade.
 *
 * RVM3: back to a real baseline grow; RV05 had switched to `stagger-children` because the old grow
 * scaled about the bar's centre.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARKS_AT, MARK_STAGGER } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['bar[*][*]', 'bar[*][*].value'],
  preset: 'stagger-children',
  partMotion: {
    'bar[*][*]': { preset: 'grow-bars-y', delay: MARKS_AT, stagger: MARK_STAGGER },
    'bar[*][*].value': { preset: 'sweep-nodes', delay: MARKS_AT + LABEL_AFTER, stagger: MARK_STAGGER },
  },
}
