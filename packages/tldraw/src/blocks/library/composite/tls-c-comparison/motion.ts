/**
 * Motion recipe for tls.c.comparison — the columns reveal side by side: the column titles rise in
 * left to right, then the items row by row across the columns (the layout emits them in that
 * reading order), each bullet with its item. A highlighted column's panel rides the block fade.
 *
 * RVM3: the bullets had no part (they rode the block fade, ahead of their text) and the items went
 * column by column, 40 ms apart, so the second column started before the first had finished.
 */

import type { MotionRecipe } from '../../../types'

const STEP = 60

export const motion: MotionRecipe = {
  parts: ['col[*].title', 'col[*].bullet[*]', 'col[*].item[*]'],
  preset: 'stagger-lines',
  partMotion: {
    'col[*].title': { preset: 'fade-up', delay: 0, stagger: STEP },
    'col[*].bullet[*]': { preset: 'fade-up', delay: 150, stagger: STEP },
    'col[*].item[*]': { preset: 'fade-up', delay: 150, stagger: STEP },
  },
}
