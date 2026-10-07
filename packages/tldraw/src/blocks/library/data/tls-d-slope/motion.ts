/**
 * Motion recipe for tls.d.slope — each line draws on from its start rail to its end rail, one series
 * after the other: its start dot and start label are there as it leaves, the end dot and end label
 * appear as it arrives. Column heads and rails ride the block fade.
 *
 * RVM3: back to `draw-path` (a real stroke draw-on since M1); RV05 had switched to a plain fade, and
 * dots and labels rode the block fade (the end values showed before their line).
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { MARKS_AT } from '../_chart/motion'

const SERIES = 120
/** A 400 ms out-eased draw is ~95 % across by 300 ms. */
const ARRIVES = 300

export const motion: MotionRecipe = {
  parts: ['line[*]', 'line[*].start', 'label[*].start', 'line[*].end', 'label[*].end'],
  preset: 'stagger-children',
  partMotion: {
    'line[*]': { preset: 'draw-path', delay: MARKS_AT, stagger: SERIES },
    'line[*].start': { preset: 'sweep-nodes', delay: MARKS_AT, stagger: SERIES },
    'label[*].start': { preset: 'sweep-nodes', delay: MARKS_AT, stagger: SERIES },
    // lines are drawn in layering order and labels in data order, so the end marks wait for the
    // later of the two
    'line[*].end': { preset: 'field-in', delay: MARKS_AT + ARRIVES + SERIES, stagger: SERIES },
    'label[*].end': { preset: 'sweep-nodes', delay: MARKS_AT + ARRIVES + SERIES, stagger: SERIES },
  },
}
