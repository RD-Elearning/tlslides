/**
 * Motion for tls.g.myth-fact — row by row: the myth fades in, the arrow wipes across, the fact
 * panel wipes in after it and its ✓ stamp pops last.
 */

import type { MotionRecipe } from '../../../types'

const ROW = 420

export const motion: MotionRecipe = {
  parts: ['head.myth', 'head.fact', 'myth[*]', 'link[*]', 'fact[*]', 'stamp[*]'],
  preset: 'stagger-children',
  partMotion: {
    'head.myth': { preset: 'sweep-nodes', delay: 0 },
    'head.fact': { preset: 'sweep-nodes', delay: 60 },
    'myth[*]': { preset: 'sweep-nodes', delay: 120, stagger: ROW },
    'link[*]': { preset: 'wipe-x', delay: 260, stagger: ROW },
    'fact[*]': { preset: 'wipe-x', delay: 360, stagger: ROW },
    'stamp[*]': { preset: 'pop', delay: 560, stagger: ROW },
  },
}
