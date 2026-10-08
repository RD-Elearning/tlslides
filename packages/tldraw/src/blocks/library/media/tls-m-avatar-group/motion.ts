/**
 * Motion recipe for tls.m.avatar-group — the faces fade in left to right in place, 80 ms apart,
 * then the +N bubble and the caption. Each avatar (edge ring, photo or initials disc, letters) is
 * one motion slot `seq[i]` emitted by the layout, so a row mixing photos and initials keeps its
 * order and no disc appears before its ring.
 *
 * RVM5: was `stagger-children` over seven part patterns: each pattern counted on its own, so the
 * initials of the third avatar could come before its disc, and every face slid up 24 px.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['seq[*]'],
  preset: 'stagger-children',
  partMotion: {
    'seq[*]': { preset: 'sweep-nodes', delay: 0, stagger: 80 },
  },
}
