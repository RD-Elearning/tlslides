/**
 * Motion recipe for tls.d.progress-ring — the coloured arc sweeps round clockwise from 12 o'clock
 * over the still grey track while the centre value counts up; the label and caption follow.
 *
 * RVM3: back to `sweep` (M1b sweeps a filled part from 12 o'clock about the centre of what it paints;
 * the layout's `ring` group carries an unpainted full-ring guide so that centre is the ring's).
 * RV05 had switched to `sweep-nodes`, a fade of the arc and its caps.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { MARKS_AT } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['ring', 'value', 'label', 'caption'],
  preset: 'stagger-children',
  partMotion: {
    ring: { preset: 'sweep', delay: MARKS_AT },
    value: { preset: 'count-up', delay: MARKS_AT },
    label: { preset: 'sweep-nodes', delay: MARKS_AT + 300 },
    caption: { preset: 'sweep-nodes', delay: MARKS_AT + 360 },
  },
}
