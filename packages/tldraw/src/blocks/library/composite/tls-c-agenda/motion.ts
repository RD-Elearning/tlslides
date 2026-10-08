/**
 * Motion recipe for tls.c.agenda — the items read in top to bottom, 120 ms apart: in each row the
 * number rises in, its title a beat later, then its note. Twelve items finish in under 2 s.
 *
 * Parts use the item[*].index, item[*].title convention, matching the tls.t.bullets pattern; the
 * notes sit in per-item slots `note[*]` (layout.ts) so a missing note never shifts a later one.
 *
 * RVM5: was `stagger-lines` with each pattern on its own 40 ms count (500 ms fade + rise + blur):
 * row 3's title could start before row 4's number, and notes counted only the items that had one.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['item[*].index', 'item[*].title', 'note[*]'],
  preset: 'stagger-lines',
  partMotion: {
    'item[*].index': { preset: 'fade-up', delay: 0, stagger: 120 },
    'item[*].title': { preset: 'fade-up', delay: 60, stagger: 120 },
    'note[*]': { preset: 'fade-up', delay: 150, stagger: 120 },
  },
}
