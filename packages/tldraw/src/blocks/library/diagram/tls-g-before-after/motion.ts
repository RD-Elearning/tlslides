/**
 * Motion for tls.g.before-after — the two panels enter side by side, "before" from the left and
 * "after" from the right, together; the arrow between them then fades in.
 *
 * RVM3: `split-in` slid every part from -24 to +24 px and left them 24 px right of their layout (J3);
 * the engine now settles it at 0 and mirrors the second part playing it. The arrow fades in on its
 * own, after the panels.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['before', 'arrow', 'after'],
  preset: 'split-in',
  partMotion: {
    arrow: { preset: 'sweep-nodes', delay: 250 },
  },
}
