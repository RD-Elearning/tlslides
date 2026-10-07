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
  // `label` is not listed: it is the tile's header and arrives with the block (and count-up would
  // rewrite the digits of "Top 10 customers").
  parts: ['value', 'delta'],
  preset: 'fade-up',
  /** P7: under `motionStyle: expressive` the value counts up. RVM3: the expressive preset was
   *  `count-up` itself (the whole tile zoomed in from 0.7 and the delta counted with the value);
   *  now the tile fades in, the value counts up and the delta rises in after it. */
  expressive: 'stagger-children',
  partMotion: {
    value: { preset: 'count-up', delay: 0 },
    delta: { preset: 'fade-up', delay: 300 },
  },
}
