/**
 * Block layout engine — box model helpers, text measurement, and child layout.
 *
 * Re-exported from `blocks/index.ts` so consumers import from the top-level block module.
 */

export { insetBox, anchorBox, splitBox } from './box-model'
export {
  estimateMetrics,
  canvasMetrics,
  tableMetrics,
  createMetricsProvider,
  isCJK,
} from './measure'
export type { MeasureTextProvider, MetricsProviderChoice, MinimalCanvasContext } from './measure'
export { createLayoutContext } from './layout-child'
export type { CreateLayoutContextOptions } from './layout-child'
