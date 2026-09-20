/**
 * Motion recipe for tls.d.bar — vertical column chart.
 *
 * Default preset: 'grow-bars-y' (B2 §5.3 row 17) — per-bar scaleY 0→1
 * anchored at the zero baseline.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['bar', 'title', 'label', 'axis/baseline'],
  preset: 'grow-bars-y',
}
