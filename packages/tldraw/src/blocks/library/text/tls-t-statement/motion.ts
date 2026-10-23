/**
 * Motion recipe for tls.t.statement — the mark, then the words rise in; a highlight or underline
 * sweeps in left to right under its words (`emphasis` group, RVM2), then the attribution.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['mark', 'text', 'text[*]', 'emphasis', 'circle', 'attribution'],
  preset: 'words-in',
  // vivid V4: a circle around the key words draws on once they are in
  partMotion: { emphasis: { preset: 'wipe-x' }, circle: { preset: 'draw-path', delay: 450 } },
}
