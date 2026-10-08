/**
 * Motion recipe for tls.d.bubble — the frame fades in, the bubbles pop in (largest first, the order
 * they are drawn in) and each label follows its bubble. The size legend rides the block fade.
 *
 * RVM3: the block preset was `pop-points`, so the whole chart zoomed in from 0.7 on a bounce and its
 * frame was opaque in ~100 ms (J5); labels used to ride the block fade (visible before the bubbles).
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, MARK_STAGGER } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['point[*]', 'label[*]'],
  preset: 'stagger-children',
  partMotion: {
    'point[*]': { preset: 'field-in', delay: 60, stagger: MARK_STAGGER },
    'label[*]': { preset: 'sweep-nodes', delay: 60 + LABEL_AFTER - 100, stagger: MARK_STAGGER },
  },
}
