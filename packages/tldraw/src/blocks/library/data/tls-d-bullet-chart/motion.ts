/**
 * Motion recipe for tls.d.bullet-chart — row by row, the measure bar grows from the start of the
 * scale while its value counts up; the target marker drops in once the bar is nearly there. Labels
 * and the qualitative bands ride the block fade.
 *
 * RVM3: back to `grow-bars-x`; RV04 had switched to `sweep-nodes` (the old grow scaled about the
 * bar's centre). Targets and values used to ride the block fade (shown before their bar).
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARKS_AT, ROW_STAGGER } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['row[*].bar', 'row[*].value', 'row[*].target'],
  preset: 'stagger-children',
  partMotion: {
    'row[*].bar': { preset: 'grow-bars-x', delay: MARKS_AT, stagger: ROW_STAGGER },
    'row[*].value': { preset: 'count-up', delay: MARKS_AT, stagger: ROW_STAGGER },
    'row[*].target': { preset: 'wipe-down', delay: MARKS_AT + LABEL_AFTER, stagger: ROW_STAGGER },
  },
}
