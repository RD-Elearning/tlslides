/**
 * Motion recipe for tls.d.line — each series draws on from its first point (a real stroke draw-on,
 * one series after the other), then its markers pop in and its end label fades in. Gridlines, ticks,
 * categories and the legend ride the block fade.
 *
 * RVM3: back to `draw-path` (fixed in the engine by M1: it measures the path and dashes it); RV05 had
 * switched to `sweep-nodes` (a plain fade) because the old draw-path did nothing.
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARKS_AT } from '../_chart/motion'

const SERIES = 120

export const motion: MotionRecipe = {
  // `series[*].seg[*]`: the later runs of a series broken by gaps (null values)
  parts: ['series[*]', 'series[*].seg[*]', 'series[*].dot[*]', 'label[*]'],
  preset: 'stagger-children',
  partMotion: {
    'series[*]': { preset: 'draw-path', delay: MARKS_AT, stagger: SERIES },
    'series[*].seg[*]': { preset: 'draw-path', delay: MARKS_AT, stagger: SERIES },
    'series[*].dot[*]': { preset: 'field-in', delay: MARKS_AT + LABEL_AFTER + 40, stagger: 40 },
    'label[*]': { preset: 'sweep-nodes', delay: MARKS_AT + LABEL_AFTER + 100, stagger: SERIES },
  },
}
