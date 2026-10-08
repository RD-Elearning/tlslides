import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

/**
 * Motion for tls.g.pyramid — the levels settle in reading order (tip to base, or base to tip when
 * inverted) one `STEP` apart, each about its own centre (`tier[i]`, a tight group); its label,
 * leader and note follow as one slot (`cap[i]`), so a level without a note never shifts the rest.
 *
 * RVM4: was an opacity + rise per part on the full-block path, indexed by the texts present.
 */
export const motion: MotionRecipe = {
  parts: ['tier[*]', 'cap[*]'],
  preset: 'stagger-children',
  partMotion: {
    'tier[*]': { preset: 'field-in', delay: 0, stagger: STEP },
    'cap[*]': { preset: 'sweep-nodes', delay: LABEL_AFTER, stagger: STEP },
  },
}
