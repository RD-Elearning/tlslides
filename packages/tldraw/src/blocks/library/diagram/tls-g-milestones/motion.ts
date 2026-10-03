/**
 * Motion for tls.g.milestones — markers appear one after another along the line.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['line', 'ms[*]'],
  preset: 'stagger-children',
}
