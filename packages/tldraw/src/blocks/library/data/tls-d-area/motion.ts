/**
 * Motion recipe for tls.d.area — each band wipes in from the left while its top edge draws on with
 * it, one series after the other. Gridlines, ticks, categories and the legend ride the block fade.
 *
 * RVM3: back to a left-to-right reveal (`wipe-x` on the fill, which the engine now tweens with
 * paired insets, plus a `draw-path` edge); RV05 had switched to `sweep-nodes` because the old wipe
 * snapped at its end (S16).
 *
 * The marks start at MARKS_AT, once the frame (the block's own fade) is mostly in.
 */

import type { MotionRecipe } from '../../../types'
import { MARKS_AT } from '../_chart/motion'

const SERIES = 120

export const motion: MotionRecipe = {
  parts: ['area[*]', 'area[*].edge'],
  preset: 'stagger-children',
  partMotion: {
    'area[*]': { preset: 'wipe-x', delay: MARKS_AT, stagger: SERIES },
    'area[*].edge': { preset: 'draw-path', delay: MARKS_AT, stagger: SERIES },
  },
}
