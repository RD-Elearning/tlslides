/**
 * Motion for tls.g.pros-cons — the two columns enter side by side, pros from the left and cons from
 * the right, together; then the verdict band rises in under them. The divider rides the block fade.
 *
 * RVM3: `split-in` slid every part from -24 to +24 px and left them 24 px right of their layout (J3);
 * the engine now settles it at 0 and mirrors the second part. The verdict has its own later rise.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['pros', 'cons', 'verdict'],
  preset: 'split-in',
  partMotion: {
    verdict: { preset: 'fade-up', delay: 300 },
  },
}
