/**
 * Motion recipe for tls.c.kpi-tile — KPI tile.
 *
 * Parts listed here must match exactly what layout() emits via data-part
 * for the block's defaults.  `sparkline` is conditionally emitted (only
 * when the sparkline prop has ≥2 data points), so it is intentionally
 * omitted from this recipe — a phantom part would violate Rule 2.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['label', 'value', 'delta'],
  preset: 'fade-up',
}
