/**
 * Motion for tls.g.matrix-2x2 — the axes draw out from their origin (the vertical one bottom-up, the
 * horizontal one left to right) and their arrowheads pop at the ends, then the quadrants fade in in
 * reading order with their names, then the plotted items pop in with their labels. Axis labels and
 * titles ride the block fade.
 *
 * RVM3: the recipe listed `axes` (matched nothing: the parts are `axes[y]`, `axes[x]`…), and quadrant
 * names and item labels were not listed, so they showed before their quadrant and point.
 */

import type { MotionRecipe } from '../../../types'

const Q = 80

export const motion: MotionRecipe = {
  parts: ['axes[y]', 'axes[x]', 'axes[yhead]', 'axes[xhead]', 'q[*]', 'qlabel[*]', 'item[*]', 'item-label[*]'],
  preset: 'draw-axis-then-nodes',
  partMotion: {
    'axes[y]': { preset: 'wipe-y', delay: 0 },
    'axes[x]': { preset: 'wipe-x', delay: 0 },
    'axes[yhead]': { preset: 'field-in', delay: 260 },
    'axes[xhead]': { preset: 'field-in', delay: 260 },
    'q[*]': { preset: 'sweep-nodes', delay: 150, stagger: Q },
    'qlabel[*]': { preset: 'fade-up', delay: 220, stagger: Q },
    'item[*]': { preset: 'field-in', delay: 520, stagger: 60 },
    'item-label[*]': { preset: 'sweep-nodes', delay: 680, stagger: 60 },
  },
}
