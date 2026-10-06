/**
 * Motion for tls.g.layers — the layers rise in one after another from the top, each with its label and note.
 *
 * RV08: `reveal-down` is a clip-path wipe that GSAP cannot interpolate (S16); `stagger-children` is opacity + a short rise.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['layer[*]', 'label[*]', 'note[*]', 'icon[*]'],
  preset: 'stagger-children',
}
