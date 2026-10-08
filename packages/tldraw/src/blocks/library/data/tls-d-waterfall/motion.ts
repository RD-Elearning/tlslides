/**
 * Motion recipe for tls.d.waterfall — the steps build left to right: each bar grows from the level
 * it starts at (the start and total bars from the zero line, a rise from the level before it, a
 * drop hangs from it and grows down: the engine reads that from the bars' geometry), the connector
 * then draws on to the next bar, and each value fades in once its bar is nearly grown.
 *
 * RVM3: real grows from each step's own level (was `stagger-children`, a fade with a rise).
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARKS_AT } from '../_chart/motion'

/** One step every 120 ms (the J5 cap): a step is a bar, its connector, its value. */
const STEP = 120

export const motion: MotionRecipe = {
  parts: ['bar[*]', 'connector[*]', 'value[*]'],
  preset: 'stagger-children',
  partMotion: {
    'bar[*]': { preset: 'grow-bars-y', delay: MARKS_AT, stagger: STEP },
    'connector[*]': { preset: 'wipe-x', delay: MARKS_AT + 200, stagger: STEP },
    'value[*]': { preset: 'sweep-nodes', delay: MARKS_AT + LABEL_AFTER, stagger: STEP },
  },
}
