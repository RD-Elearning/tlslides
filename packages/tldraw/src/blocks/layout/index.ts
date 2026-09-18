/**
 * Block layout engine — box model helpers, text measurement, child layout,
 * autofit, lists, and vertical alignment.
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
export { autofitText } from './autofit'
export type { AutofitResult } from './autofit'
export { renderList } from './lists'
export type { ListMarker, ListOpts } from './lists'
export { alignVertically } from './vertical-align'
