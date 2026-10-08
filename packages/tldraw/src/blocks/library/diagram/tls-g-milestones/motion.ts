import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

/** The first milestone starts once the line wipe is well along. */
const MARKS = 100

/**
 * Motion for tls.g.milestones — the line draws along its length first (left to right `rail-x`,
 * top-down `rail-y`, the done part inside it), then the diamonds settle in order one `STEP`
 * apart (`gem[i]`, about their own centre) with their date and label after them (`cap[i]`).
 *
 * RVM4: the line faded with a rise; dates and labels were indexed by the texts present.
 */
export const motion: MotionRecipe = {
  parts: ['rail-x', 'rail-y', 'gem[*]', 'cap[*]'],
  preset: 'stagger-children',
  partMotion: {
    'rail-x': { preset: 'wipe-x', delay: 0 },
    'rail-y': { preset: 'wipe-down', delay: 0 },
    'gem[*]': { preset: 'field-in', delay: MARKS, stagger: STEP },
    'cap[*]': { preset: 'sweep-nodes', delay: MARKS + LABEL_AFTER, stagger: STEP },
  },
}
