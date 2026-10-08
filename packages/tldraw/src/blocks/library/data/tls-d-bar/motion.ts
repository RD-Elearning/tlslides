/**
 * Motion recipe for tls.d.bar — the title fades up, the bars grow from the zero line left to right
 * (along x in a horizontal chart: the engine follows the bars' geometry), and each value label
 * fades in once its bar is nearly grown. Axis, gridlines and category labels ride the block fade.
 *
 * RVM3: back to a real baseline grow (`grow-bars-y`, fixed in the engine by M1); RV05 had switched
 * to `stagger-children` because the old grow scaled about the bar's centre.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARK_STAGGER } from '../_chart/motion'

const BARS_AT = 80

export const motion: MotionRecipe = {
  parts: ['title', 'bar[*][*]', 'bar[*][*].value'],
  preset: 'stagger-children',
  partMotion: {
    title: { preset: 'fade-up' },
    'bar[*][*]': { preset: 'grow-bars-y', delay: BARS_AT, stagger: MARK_STAGGER },
    'bar[*][*].value': { preset: 'sweep-nodes', delay: BARS_AT + LABEL_AFTER, stagger: MARK_STAGGER },
  },
}
