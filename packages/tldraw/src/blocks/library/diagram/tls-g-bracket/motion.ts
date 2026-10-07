import type { MotionRecipe } from '../../../types'
import { STEP } from '../_motion'

/**
 * Motion for tls.g.bracket — the items settle in reading order one `STEP` apart (each box about
 * its own centre, its text just after it), the brace draws on along its length beside them, and
 * the group label arrives once the brace is drawn.
 *
 * RVM4: items, brace and label were three fades; the brace is a stroked path, so it now draws.
 */
export const motion: MotionRecipe = {
  parts: ['item[*]', 'item[*].text', 'brace', 'label'],
  preset: 'sweep-nodes',
  partMotion: {
    'item[*]': { preset: 'field-in', delay: 0, stagger: STEP },
    'item[*].text': { preset: 'sweep-nodes', delay: 60, stagger: STEP },
    brace: { preset: 'draw-path', delay: 200 },
    label: { preset: 'sweep-nodes', delay: 520 },
  },
}
