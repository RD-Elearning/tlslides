/**
 * Motion for tls.g.target — the core pops in first and each ring grows out of it, one `STEP`
 * apart (each band scales about the common centre); a ring's leader, pin, label and note follow.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

export const motion: MotionRecipe = {
  parts: ['band[*]', 'cap[*]'],
  preset: 'stagger-children',
  partMotion: {
    'band[*]': { preset: 'pop', delay: 0, stagger: STEP * 1.5 },
    'cap[*]': { preset: 'sweep-nodes', delay: LABEL_AFTER + 60, stagger: STEP * 1.5 },
  },
}
