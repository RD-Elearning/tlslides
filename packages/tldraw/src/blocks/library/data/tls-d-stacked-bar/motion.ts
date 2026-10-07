/**
 * Motion recipe for tls.d.stacked-bar — each stack grows from the zero line as one column (the
 * engine scales every segment about the zero line, columns one stagger apart, so no gap opens inside
 * a stack); segment values and totals fade in after their column. A horizontal chart grows along x.
 *
 * RVM3: back to `grow-segments`; RV05 had switched to `stagger-children` because the old grow scaled
 * each segment about its own centre.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARKS_AT } from '../_chart/motion'

/** Columns start one stagger apart; the labels below are listed series by series, so each one
 *  starts at least LABEL_AFTER after its column (and later series a little later still). */
const COLUMN_STAGGER = 80

export const motion: MotionRecipe = {
  parts: ['seg[*][*]', 'seg[*][*].value', 'total[*]'],
  preset: 'stagger-children',
  partMotion: {
    'seg[*][*]': { preset: 'grow-segments', delay: MARKS_AT, stagger: COLUMN_STAGGER },
    'seg[*][*].value': { preset: 'sweep-nodes', delay: MARKS_AT + LABEL_AFTER + 40, stagger: COLUMN_STAGGER },
    'total[*]': { preset: 'sweep-nodes', delay: MARKS_AT + LABEL_AFTER + 40, stagger: COLUMN_STAGGER },
  },
}
