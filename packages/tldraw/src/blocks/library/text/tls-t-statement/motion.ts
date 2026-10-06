/**
 * Motion recipe for tls.t.statement — the mark, then the words rise in; a highlight or underline
 * sweeps in left to right under its words (`emphasis` group, RVM2), then the attribution.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['mark', 'text', 'text[*]', 'emphasis', 'attribution'],
  preset: 'words-in',
  partMotion: { emphasis: { preset: 'wipe-x' } },
}
