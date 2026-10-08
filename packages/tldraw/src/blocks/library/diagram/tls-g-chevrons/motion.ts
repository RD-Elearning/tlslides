import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

/**
 * Motion for tls.g.chevrons — the row is revealed left to right: each chevron wipes in over its
 * own shape (`seg[i]`, a tight group), one `STEP` after the one before, and its label and note
 * fade in once the wipe has passed them.
 *
 * RVM4: back on `wipe-x` (RV07 had moved it to an opacity fade because the old clip keyframes
 * snapped, S16; M1 pairs the insets, so the wipe is smooth). The block itself only fades.
 */
export const motion: MotionRecipe = {
  parts: ['seg[*]', 'label[*]', 'text[*]'],
  preset: 'sweep-nodes',
  partMotion: {
    'seg[*]': { preset: 'wipe-x', delay: 0, stagger: STEP },
    'label[*]': { preset: 'sweep-nodes', delay: LABEL_AFTER, stagger: STEP },
    'text[*]': { preset: 'sweep-nodes', delay: LABEL_AFTER + 60, stagger: STEP },
  },
}
