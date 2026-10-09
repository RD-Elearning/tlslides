/**
 * Block system runtime primitives. Concrete block definitions live in `@tlslides/blocks`.
 * This package provides the types, registry, and bridge between blocks and shapes.
 */

export * from './types'
export { BlockRegistry, createBlockComponents } from './registry'
export { blockToShape, shapeToBlock, BLOCK_PROP_KEY } from './shape-bridge'
export { isShown } from './schema-helpers'
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
  canvasMetrics,
  tableMetrics,
  editorMetrics,
  createMetricsProvider,
  isCJK,
  createLayoutContext,
  layoutBlock,
  defineCompositeBlock,
  autofitText,
  renderList,
  alignVertically,
} from './layout'
export type {
  MeasureTextProvider,
  MetricsProviderChoice,
  MinimalCanvasContext,
  CreateLayoutContextOptions,
  AutofitResult,
  ListMarker,
  ListOpts,
  CompositeBlockConfig,
} from './layout'
export { renderNodeToDom, paintToCSS, BlockRenderer, HOST_CSS_VARS } from './render-dom'
export type { BlockRendererProps, HostLayoutContextValue } from './render-dom'
export { HostRegistry } from './host-registry'
export type { HostRenderer, HostRenderContext } from './host-registry'
export { renderNodeToSvg, renderSvgDefs } from './render-svg'
// R2 — html-kind block types exported from types.ts via `export * from './types'` above.
// Explicit re-export for discoverability:
export type { BlockKind, HtmlTemplateContext, BlockMotionRuntime } from './types'
// NOT exported: `./parity-harness`. It is a Node-only test harness — it `import`s
// `child_process` and `require.resolve`s a worker script. Re-exporting it from the package root
// put `child_process` in the browser bundle's import graph, and esbuild then failed the whole
// bundle with `Could not resolve "child_process"` — emitting the `.d.ts` files but **no
// `dist/index.js` at all**, while `turbo run build:packages` still exited 0. Every consumer of
// `dist` broke with no error pointing at the cause. The specs that use it import it directly
// (`from './parity-harness'`), which is the only way it should ever be reached.
export {
  probeRects,
  probeTextAndLines,
  probeMediaAndIcons,
  PROBE_BOX,
} from './probe-blocks'
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

// P22 — motion tokens + driver (05-motion-system.md §5.2, §5.6).
export {
  DURATION_TOKENS,
  EASING_TOKENS,
  DISTANCE_TOKENS,
  SCALE_TOKENS,
  BLUR_TOKENS,
} from './motion/tokens'
export {
  ALLOWED_PROPERTIES,
  FORBIDDEN_PROPERTIES,
} from './motion/driver'
export type {
  MotionKeyframes,
  MotionOptions,
  MotionHandle,
  MotionState,
  MotionStep,
  MotionDriver,
} from './motion/driver'
export {
  MOTION_PRESETS,
  PRESET_IDS,
  getPreset,
} from './motion/presets'
export type { MotionPreset, MotionPresetId } from './motion/presets'
export { createWAAPI_driver } from './motion/waapi-driver'
export { createGsapDriver } from './motion/gsap-driver'
export type { GsapInstance, GsapTimeline, GsapVars } from './motion/gsap-driver'

// D2 — 16 slide layouts as pure geometry functions (06-slide-composition.md §6.3).
export { SLIDE_LAYOUTS, getSlideLayout } from './slide-layouts'
export type { SlideLayoutId, SlideLayout } from './slide-layouts'

// D3 — slide compiler: SlideSpec → ComponentShape[] (06-slide-composition.md §6.3).
export { compileSlide } from './slide-compiler'
export type { CompileSlideResult, CompileFinding } from './slide-compiler'

// Q8 — slide decompiler: TDPage/TDDocument → SlideSpec/DeckSpec (the reverse path).
export { documentToDeckSpec, pageToSlideSpec } from './slide-decompiler'
export type { DecompileFinding, DecompileOptions } from './slide-decompiler'

// Q9 — deckLayoutContext: one LayoutContext builder, three consumers (editor, DeckViewer, export).
export { deckLayoutContext, contextForBlock } from './deck-context'

// W1 — DeckSpec → TDDocument (the compile-side counterpart to documentToDeckSpec above).
export { deckSpecToDocument, resolveDeckFrame, resolveDeckTheme } from './deck-document'
export type { DeckDocumentResult } from './deck-document'

// Q3/W1 — the built-in block library (14 layout containers, 9 text blocks, 1 data block, 1 composite, 1 media)
// and its registration helper. `./library` is the aggregate; individual family arrays are also
// exported directly for a host that wants only one family.
export { BUILT_IN_BLOCKS, registerBuiltInBlocks, layoutBlocks, textBlocks, dataBlocks, compositeBlocks, mediaBlocks } from './library'

// P22/B3 — motion resolution: a block's declarative recipe + spec overrides → concrete
// block-level (`ShapeAnimation`) and part-level (`MotionKeyframes`+timing) descriptors.
export {
  resolveBlockMotion,
  resolvePartMotion,
  deriveShapeAnimation,
  presetToEffect,
} from './motion/resolve-motion'
export type { ResolvedBlockMotion, ResolvedPartMotion } from './motion/resolve-motion'

// R6 — block show duration + slide timeline: pure timing functions for the backend,
// the viewer, and the digest. DOM-free, no React, no browser APIs.
export { blockShowDuration, slideTimeline, countLayoutParts } from './motion/timeline'
export type {
  BlockShowDuration,
  SlideTimeline,
  SlideTimelineStep,
  SlideTimelineBlock,
} from './motion/timeline'

// Q19 — validation + the AI capability digest. `validateDeckSpec`'s findings are written to be
// fed straight back to a model as a fix instruction; `capabilityDigest` is generated from
// `BUILT_IN_BLOCKS` and `SLIDE_LAYOUTS` so it cannot drift from the library the way a
// hand-written prompt fragment would.
export { validateDeckSpec, defaultBlockRegistry } from './validate-deck-spec'
export type { DeckFinding } from './validate-deck-spec'
export { capabilityDigest, capabilityDigestData, capabilityIndex, capabilityIndexData } from './capability-digest'
export type {
  CapabilityDigest,
  CapabilityBlockDigest,
  CapabilityLayoutDigest,
  CapabilitySlotDigest,
  CapabilityIndexEntry,
  CapabilityIndexOptions,
  CapabilityDetailOptions,
} from './capability-digest'

// LO0/LO1 — the layout oracle: a block's natural size read off its layout tree, and a slide's
// geometry report (overlaps, overflow, text collisions, numeric fixes) as JSON and as compact
// LLM-facing text (`reviews/blocks/layout-oracle/README.md`). Package-level export is LO4.
export {
  measureBlock,
  collectPaintedLeaves,
  paintedBounds,
  pathBounds,
  unionBox,
  DEFAULT_PROBE_HEIGHT,
} from './layout/measure-block'
export type {
  BlockMeasure,
  MeasureBlockOptions,
  MeasureConfidence,
  PaintedLeaf,
  TextLeafMeasure,
  CollectedLeaves,
} from './layout/measure-block'
export {
  analyzeSlide,
  analyzeDeck,
  formatLayoutReport,
  layoutMap,
  blockLayer,
  classifyOverlap,
  MAP_CELL,
  NEAR_MARGIN,
} from './layout-report'
export type {
  LayoutReport,
  BlockReport,
  TextLeafReport,
  LayoutFinding,
  LayoutFindingCode,
  BlockLayer,
  OverlapParty,
  AnalyzeSlideOptions,
  VisualCheck,
} from './layout-report'
// LO3 — size cards: per-block planning data sampled from `measureBlock` (committed as
// `__generated__/block-metrics.json`, regenerated by `tools/layout-report/gen-block-metrics.js`).
export {
  buildBlockMetrics,
  stringifyBlockMetrics,
  sizeHint,
  blockSizeHints,
  stringifySizeHints,
  METRICS_WIDTHS,
} from './block-metrics'
export type {
  BlockMetrics,
  BlockMetricsFile,
  BuildBlockMetricsOptions,
  HeightFit,
  HeightModel,
  HeightModelVar,
  TextSlotMetrics,
} from './block-metrics'
// LO2 — paint layers (`BlockSpec.layer` / `BlockDefinition.layer`).
export { definitionLayer, isBlockLayer } from './block-layer'
export { splitLayeredBlocks } from './slide-compiler'
export type { LayeredSplit, LayeredRegionBlock } from './slide-compiler'

// Shared nearest-name suggestion, used by both `compileSlide`'s region findings and
// `validateDeckSpec`'s — so the same misspelled name gets the same suggested fix from both.
export { levenshtein, nearestName } from './nearest-name'

export type { DeckSpec } from './types'
