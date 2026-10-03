/**
 * Motion recipe for tls.d.sparkline — the line draws on.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['line', 'dot', 'label', 'last'],
  preset: 'draw-path',
}
