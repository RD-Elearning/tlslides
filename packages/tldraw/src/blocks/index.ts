/**
 * Block system runtime primitives. Concrete block definitions live in `@tlslides/blocks`.
 * This package provides the types, registry, and bridge between blocks and shapes.
 */

export * from './types'
export { BlockRegistry, createBlockComponents } from './registry'
export { blockToShape, shapeToBlock, BLOCK_PROP_KEY } from './shape-bridge'
// P19 — design tokens v2 (`reviews/blocks/02-design-language.md`).
export type { DeckTokens } from './tokens'
export { resolveTokens, resolveColor, surfaceFromBackground, surfaceFromPaint } from './tokens'
export {
  TYPE_SCALE,
  SPACE_SCALE,
  SPACE_ORDER,
  RADIUS_SCALE,
  ELEVATION_SCALE,
  MOTION_SCALE,
  applyDensity,
  generateCategoricalRamp,
} from './scales'
export type { RGB, HSL, ContrastSolution } from './color-math'
export {
  insetBox,
  anchorBox,
  splitBox,
  estimateMetrics,
  createLayoutContext,
} from './layout'
export type { MeasureTextProvider, CreateLayoutContextOptions } from './layout'
export { renderNodeToDom, paintToCSS, BlockRenderer } from './render-dom'
export type { BlockRendererProps } from './render-dom'
export { renderNodeToSvg, renderSvgDefs } from './render-svg'
export {
  clamp,
  hexToRgb,
  tryHexToRgb,
  rgbToHex,
  mixHex,
  rgbToHsl,
  hslToRgb,
  relativeLuminance,
  contrastRatio,
  solveForContrast,
} from './color-math'
