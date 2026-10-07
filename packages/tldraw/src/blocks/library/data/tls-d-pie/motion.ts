/**
 * Motion recipe for tls.d.pie — the slices sweep in clockwise from 12 o'clock as one disc (every
 * slice is clipped by the same growing sector about the pie's centre), then the leaders draw out
 * and the labels fade in. A legend rides the block fade.
 *
 * RVM3: back to `sweep` (M1b sweeps a filled part from 12 o'clock); RV05 had switched to
 * `sweep-nodes` (a fade per slice) because the old sweep did nothing on fills.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { MARKS_AT, MARK_STAGGER } from '../_chart/motion'

/** The sweep is 500 ms; labels start as it closes (an out ease is ~95 % round by then). */
const LABELS_AT = 380

export const motion: MotionRecipe = {
  parts: ['slice[*]', 'label[*].leader', 'label[*]', 'label[*].pct'],
  preset: 'stagger-children',
  partMotion: {
    'slice[*]': { preset: 'sweep', delay: MARKS_AT, stagger: 0 },
    'label[*].leader': { preset: 'draw-path', delay: MARKS_AT + LABELS_AT, stagger: MARK_STAGGER },
    'label[*]': { preset: 'sweep-nodes', delay: MARKS_AT + LABELS_AT + 60, stagger: MARK_STAGGER },
    'label[*].pct': { preset: 'sweep-nodes', delay: MARKS_AT + LABELS_AT + 60, stagger: MARK_STAGGER },
  },
}
