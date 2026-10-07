import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

/**
 * Motion for tls.g.layers — the stack fills from the top: each layer wipes in left to right over
 * its own bar (`slab[i]`, a tight group, flat or slanted) one `STEP` after the one above it; its
 * icon, label, note and leader follow as one slot (`cap[i]`).
 *
 * RVM4: was an opacity + rise per part (RV08 left `reveal-down` for S16), indexed by the texts and
 * icons present.
 */
export const motion: MotionRecipe = {
  parts: ['slab[*]', 'cap[*]'],
  preset: 'stagger-children',
  partMotion: {
    'slab[*]': { preset: 'wipe-x', delay: 0, stagger: STEP },
    'cap[*]': { preset: 'sweep-nodes', delay: LABEL_AFTER, stagger: STEP },
  },
}
