/**
 * Motion recipe for tls.m.image-compare — before, then after, then the divider (opacity and translate: a clip-path wipe does not animate, S16).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['before', 'before.label.pill', 'before.label', 'after', 'after.label.pill', 'after.label', 'divider', 'divider.handle'],
  preset: 'stagger-children',
}
