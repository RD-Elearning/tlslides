/**
 * Motion recipe for tls.d.gauge — the dial's bands are revealed from its start (left) round to its
 * end (right) as one wipe, the value counts up meanwhile, then the needle and hub fade in on the
 * reading (a 400 ms fade: a bouncy pop settled in ~100 ms, under J5's 150) and the label fades in.
 * Ticks and their labels ride the block fade.
 *
 * RVM3: a reveal from the gauge's start angle side (was `sweep-nodes`, band fades). The engine's
 * filled `sweep` opens from 12 o'clock, which on a 180° dial would show the right half first, so the
 * dial uses a left-to-right `wipe-x`: every band shares the block's box, so they wipe as one.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { MARKS_AT } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['bands[*]', 'value', 'needle', 'needle.hub', 'label'],
  preset: 'stagger-children',
  partMotion: {
    'bands[*]': { preset: 'wipe-x', delay: MARKS_AT, stagger: 0 },
    value: { preset: 'count-up', delay: MARKS_AT + 100 },
    needle: { preset: 'sweep-nodes', delay: MARKS_AT + 300 },
    'needle.hub': { preset: 'sweep-nodes', delay: MARKS_AT + 300 },
    label: { preset: 'sweep-nodes', delay: MARKS_AT + 360 },
  },
}
