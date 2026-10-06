/**
 * Motion for tls.g.milestones — the line, then each marker with its date and label left to right.
 *
 * RV08: dates, labels and the progress line were not parts.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['line', 'line.progress', 'ms[*]', 'date[*]', 'label[*]'],
  preset: 'stagger-children',
}
