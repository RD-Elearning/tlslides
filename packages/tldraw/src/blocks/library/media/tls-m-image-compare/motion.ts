/**
 * Motion recipe for tls.m.image-compare — left to right, nothing slides: the "before" photo fades
 * in, the "after" photo a beat later, the divider draws down between them and its handle settles from 96 %,
 * then each label pill fades in over its own photo. The same order reads right in both modes
 * (split: the before half over the after photo; side by side: two photos).
 *
 * RVM5: was `stagger-children` (every part rose 24 px, 40 ms apart, labels before the after photo).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['before', 'before.label.pill', 'before.label', 'after', 'after.label.pill', 'after.label', 'divider', 'divider.handle'],
  preset: 'stagger-children',
  partMotion: {
    before: { preset: 'sweep-nodes', delay: 0 },
    after: { preset: 'sweep-nodes', delay: 150 },
    divider: { preset: 'wipe-down', delay: 350 },
    'divider.handle': { preset: 'field-in', delay: 500 },
    'before.label.pill': { preset: 'sweep-nodes', delay: 600 },
    'before.label': { preset: 'sweep-nodes', delay: 600 },
    'after.label.pill': { preset: 'sweep-nodes', delay: 680 },
    'after.label': { preset: 'sweep-nodes', delay: 680 },
  },
}
