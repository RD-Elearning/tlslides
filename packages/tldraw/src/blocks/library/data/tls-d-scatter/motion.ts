/**
 * Motion recipe for tls.d.scatter — the frame fades in, the points pop in one after another, the
 * trend line draws on through them, and each point's label follows its point.
 *
 * RVM3: the block preset was `pop-points`, so the whole chart zoomed in from 0.7 on a bounce and its
 * frame (root, grid, ticks) was opaque in ~100 ms (J5); the frame now fades with the block and only
 * the points pop.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARK_STAGGER } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['point[*]', 'label[*]', 'trend'],
  preset: 'stagger-children',
  partMotion: {
    'point[*]': { preset: 'field-in', delay: 60, stagger: MARK_STAGGER },
    'label[*]': { preset: 'sweep-nodes', delay: 60 + LABEL_AFTER - 100, stagger: MARK_STAGGER },
    trend: { preset: 'draw-path', delay: 300 },
  },
}
