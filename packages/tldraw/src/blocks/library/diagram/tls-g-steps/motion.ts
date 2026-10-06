/**
 * Motion for tls.g.steps — the steps rise in one after another, each connector following the step
 * it leaves (RV07: it used to fade the whole strip in as one piece).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['step[*]', 'step[*].connector', 'step[*].connector-arrowhead'],
  preset: 'stagger-children',
}