/**
 * Shared chart engine — re-exports all pure functions.
 *
 * 04 §4.8: "Thirty-two data blocks, one engine." This module is that engine.
 * Pure functions only, no DOM, no block dependency.
 */

export {
  linearScale,
  niceNumber,
  niceTicks,
  barDomain,
} from './linear-scale'
export type { LinearScale, AxisTicks } from './linear-scale'

export {
  computeYAxis,
  formatTickLabel,
} from './axis-layout'
export type { AxisLayoutConfig, AxisLayoutResult } from './axis-layout'

export {
  assignSeriesColors,
  highlightColor,
  MAX_HUES,
} from './series-color'
