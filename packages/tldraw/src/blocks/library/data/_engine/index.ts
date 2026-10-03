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

export { arcPath, wedgePath } from './arc-path'
export { linePath, areaPath } from './line-path'
export type { Point, CurveKind } from './line-path'
export { formatValue } from './format-value'
export type { ValueFormat, FormatOptions } from './format-value'
export { multiSeriesDomain, bandScale } from './multi-series'
export type { StackMode, SeriesLike, BandScale } from './multi-series'
export { layoutLegend, LEGEND_SWATCH } from './legend'
export type { LegendPlacement, LegendItem } from './legend'
export { directLabel } from './direct-label'
export type { LabelAnchor } from './direct-label'
