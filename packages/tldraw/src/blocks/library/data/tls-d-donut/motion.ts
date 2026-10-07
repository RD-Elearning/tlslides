/**
 * Motion recipe for tls.d.donut — the ring sweeps in clockwise from 12 o'clock as one ring (every
 * segment is clipped by the same growing sector about the centre) while the centre value counts up;
 * then the centre label, the leaders and the labels fade in. A legend and the grey remainder of a
 * ring with a `total` ride the block fade.
 *
 * RVM3: back to `sweep` (M1b sweeps a filled part from 12 o'clock); the recipe used to list
 * `legend/*`, which matched nothing.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { MARKS_AT, MARK_STAGGER } from '../_chart/motion'

const LABELS_AT = 380

export const motion: MotionRecipe = {
  parts: ['slice[*]', 'centre', 'centre.label', 'label[*].leader', 'label[*]', 'label[*].pct'],
  preset: 'stagger-children',
  partMotion: {
    'slice[*]': { preset: 'sweep', delay: MARKS_AT, stagger: 0 },
    centre: { preset: 'count-up', delay: MARKS_AT + 80 },
    'centre.label': { preset: 'sweep-nodes', delay: MARKS_AT + 300 },
    'label[*].leader': { preset: 'draw-path', delay: MARKS_AT + LABELS_AT, stagger: MARK_STAGGER },
    'label[*]': { preset: 'sweep-nodes', delay: MARKS_AT + LABELS_AT + 60, stagger: MARK_STAGGER },
    'label[*].pct': { preset: 'sweep-nodes', delay: MARKS_AT + LABELS_AT + 60, stagger: MARK_STAGGER },
  },
}
