/**
 * Motion recipe for tls.d.gauge — the dial's bands are revealed from its start (left) round to its
 * end (right) as one wipe, the value counts up meanwhile, then the needle and hub fade in on the
 * reading (a 400 ms fade: a bouncy pop settled in ~100 ms, under J5's 150) and the label fades in.
 * Ticks and their labels ride the block fade.
 *
 * RVM3: a reveal from the gauge's start angle side (was `sweep-nodes`, band fades). RVM6: a real
 * sweep (`partMotion` startAngle / sweepAngle / sweepCentre) instead of RVM3's left-to-right
 * `wipe-x`; every band shares the sweep, so the dial opens as one.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { MARKS_AT } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['bands[*]', 'value', 'needle', 'needle.hub', 'label'],
  preset: 'stagger-children',
  partMotion: {
    // M6: a true dial sweep from the gauge's start (9 o'clock) round 180° to its end, about the
    // ring's centre (the bottom middle of the half-ring the bands paint)
    'bands[*]': { preset: 'sweep', delay: MARKS_AT, stagger: 0, startAngle: -90, sweepAngle: 180, sweepCentre: '50% 100%' },
    value: { preset: 'count-up', delay: MARKS_AT + 100 },
    needle: { preset: 'sweep-nodes', delay: MARKS_AT + 300 },
    'needle.hub': { preset: 'sweep-nodes', delay: MARKS_AT + 300 },
    label: { preset: 'sweep-nodes', delay: MARKS_AT + 360 },
  },
}
