import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

/**
 * Motion for tls.g.funnel — the funnel pours in from the widest stage: each stage wipes in over
 * its own shape (top-down in a vertical funnel `seg[i]`, left to right in a horizontal one
 * `col[i]`), one `STEP` apart; its label follows, then its note with the leader (`side[i]`, one
 * slot per stage even when a stage has no note).
 *
 * RVM4: was an opacity + rise per part with notes and leaders on their own index (a stage without
 * a note shifted every later note one slot early).
 */
export const motion: MotionRecipe = {
  parts: ['seg[*]', 'col[*]', 'label[*]', 'side[*]'],
  preset: 'stagger-children',
  partMotion: {
    'seg[*]': { preset: 'wipe-down', delay: 0, stagger: STEP },
    'col[*]': { preset: 'wipe-x', delay: 0, stagger: STEP },
    'label[*]': { preset: 'sweep-nodes', delay: LABEL_AFTER, stagger: STEP },
    'side[*]': { preset: 'sweep-nodes', delay: LABEL_AFTER + 80, stagger: STEP },
  },
}
