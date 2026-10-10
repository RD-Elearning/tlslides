/**
 * LO1 — the layout oracle: `analyzeSlide(spec) → LayoutReport` and `formatLayoutReport(report)`.
 *
 * Lets the AI *read* a slide's geometry instead of screenshotting it
 * (`reviews/blocks/layout-oracle/README.md`). The slide is compiled with the same `compileSlide`
 * the editor uses (so every box is the box the editor places), then each block is re-laid at its
 * final box with a chosen text-metrics provider (default `editorMetrics` = `tableMetrics`, line widths ±5% of real Inter at
 * p95 — LO5; since LO6 the editor itself uses it, so report and screen wrap the same) and
 * its geometry is read straight off the `LayoutNode` tree via `measureBlock` /
 * `collectPaintedLeaves`.
 *
 * Findings carry a concrete, numeric `fix` an LLM can act on. The text form is deterministic and
 * compact (one line per block, findings, a 48×27 ASCII occupancy map).
 *
 * Layers (LO2): `blockLayer()` (`block-layer.ts`) — `block.layer` ?? `def.layer` ?? category
 * `decoration` → backdrop, else content; `classifyOverlap()` applies the layer policy. z is the
 * compiled `childIndex` (region backdrops under everything, region overlays over everything,
 * `free[]` in array order — see `compileLayered`).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import { applyStyleBlockDefaults, deckSpecTokens, getDeckStyle, STYLE_MASTER_PREFIX, styleMasterFor, styleMasters } from './styles'
import { isEditorOnly, resolveMaster } from './master-renderer'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type {
  BlockLayer,
  BlockSpec,
  Box,
  CapacityReport,
  DeckSpec,
  DeckStyle,
  LayoutNode,
  MotionStyle,
  Paint,
  ResolvedTokens,
  Size,
  SlideSpec,
  SurfaceContext,
} from './types'
import type { DeckTheme } from '~types'
import { resolveThemeColor } from '~state/shapes/shared'
import { designFindings, inspectBlock, type BlockInspection, type DesignBlock, type DesignCode } from './design-checks'
import { paintAt, parseInk, type Background } from './layout/paint-model'
import { shapeToRevealBlock } from './shape-bridge'
import type { BlockRegistry } from './registry'
import { BLOCK_PROP_KEY } from './shape-bridge'
import { compileSlide, splitLayeredBlocks, type CompileFinding } from './slide-compiler'
import { blockLayer } from './block-layer'
import { getSlideLayout, SLIDE_LAYOUTS } from './slide-layouts'
import { imageSurface, resolveTokens, surfaceFromBackground } from './tokens'
import { MAX_NESTING_DEPTH } from './types'
import { resolveDeckFrame, resolveDeckTheme } from './deck-document'
import { defaultBlockRegistry } from './validate-deck-spec'
import { createLayoutContext, layoutBlock } from './layout/layout-child'
import { editorMetrics, estimateMetrics, type MeasureTextProvider } from './layout/measure'
import {
  collectPaintedLeaves,
  measureBlock,
  paintedBounds,
  unionBox,
  type MeasureConfidence,
  type TextLeafMeasure,
} from './layout/measure-block'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Types                                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Paint layer of a block (LO2). `backdrop` sits behind content, `overlay` on top of it. */
export type { BlockLayer } from './types'
export { blockLayer } from './block-layer'

export type LayoutFindingCode =
  | 'slide/overflow'
  | 'region/overflow'
  | 'region/unknown'
  | 'region/displaced'
  | 'block/unregistered'
  | 'block/layout-failed'
  // CMP1: a nested block the engine did not draw (nested deeper than `MAX_NESTING_DEPTH`).
  | 'block/dropped'
  | 'layout/overlap'
  | 'text/collision'
  | 'text/occluded'
  | 'text/overflow'
  | 'content/overflow'
  | 'text/shrunk'
  | 'capacity/exceeded'
  // LO5b composition hints (no geometry error; help an LLM compose without a screenshot).
  | 'layout/unbalanced'
  | 'layout/crowded'
  | 'region/empty'
  // CMP2 design checks (`design-checks.ts`): inside compositions, contrast, type, motion.
  | DesignCode

export interface LayoutFinding {
  code: LayoutFindingCode
  severity: 'error' | 'warning' | 'info'
  blockIds: string[]
  message: string
  /** A concrete, numeric remedy, when one can be computed. */
  fix?: string
}

/** One text leaf of a block, in slide coordinates. */
export interface TextLeafReport {
  part?: string
  propPath?: string
  lines: number
  lineHeight: number
  fontSize: number
  scale: number
  maxLineWidth: number
  chars: number
  charsPerLine: number
  /** The text node's box (wrap width), slide coordinates. */
  box: Box
  /** First line top → last line bottom, widest line; slide coordinates. */
  painted: Box
  /** CMP2: the nested authored block that owns this text (`g1/c2/b1`); absent = the block itself. */
  block?: string
}

/** CMP2 — an authored nested child of a block (a container's child), slide coordinates. */
export interface SubBlockReport {
  id: string
  /** Id path from the slide-level block: `g1/c2/b1`. */
  path: string
  type: string
  /** The parent's path (the slide-level block's id for a direct child). */
  parent: string
  /** Authored nesting level: the slide-level block is 1, its children 2, … */
  level: number
  layer: BlockLayer
  box: Box
  /** Painted extent (surfaces included); `null` = paints nothing. */
  painted: Box | null
}

export interface BlockReport {
  /** Map letter in the ASCII map. */
  letter: string
  id: string
  /** `regions.<name>[i]` or `free[i]`. */
  path: string
  type: string
  /** Region name, or `'free'` for `spec.free[]`. */
  region: string
  layer: BlockLayer
  /** LO2: a region block with an explicit backdrop/overlay `layer` — it takes the region (LO2.1:
   *  or `anchorTo`) box, or its natural size at an `anchor`, and is not part of the region's
   *  vertical stack (excluded from region fill/overflow maths). */
  outOfFlow?: true
  /** Paint order: higher paints on top (the compiled `childIndex`). */
  z: number
  /** CMP1: a backdrop with `bleed: true` — may leave the frame (no `slide/overflow`, and it does
   *  not count toward the slide's margins). */
  bleed?: true
  /** The box the editor gives the block (slide coordinates). */
  box: Box
  /** What the content needs at `box.width` (painted union; see `measureBlock`). */
  natural: Size
  /** Fill-the-box block: no natural height of its own. */
  elastic: boolean
  /** Painted union at the final box, slide coordinates. `null` = paints nothing. */
  painted: Box | null
  /** How far painted content leaves the box (0 = inside). */
  contentOverflow: { dx: number; dy: number }
  text: TextLeafReport[]
  /** `def.capacity()` at the final box, when the block defines it. */
  capacity?: CapacityReport
  confidence: MeasureConfidence
  reason?: string
  /** CMP2: the block's authored nested children, depth first (absent = none). */
  children?: SubBlockReport[]
}

export interface LayoutReport {
  slideId: string
  layout: string
  frame: Size
  /** The text-metrics provider the report used. */
  metrics: string
  regions: Record<string, Box>
  blocks: BlockReport[]
  findings: LayoutFinding[]
  /** Distance from the painted content of all blocks to each frame edge (negative = past it). */
  margins: { top: number; right: number; bottom: number; left: number }
  /** Share of the frame (by 40-unit cells) no block paints, 0-1. */
  freeSpace: number
  /** LO5: the blocks worth a screenshot, each with why (confidence below `high`, the editor
   *  wraps/paints its text differently from the report, or within the calibrated error margin of
   *  an overflow/collision). Empty = the report alone is trustworthy for this slide. */
  needsVisualCheck: VisualCheck[]
}

/** One entry of `LayoutReport.needsVisualCheck`. */
export interface VisualCheck {
  blockId: string
  reason: string
}

export interface AnalyzeSlideOptions {
  /** Slide frame in slide units. Default 1920×1080. */
  frame?: Size
  /** Resolved tokens. Default: the default deck theme's. */
  tokens?: ResolvedTokens
  /** Block registry. Default: the built-in blocks. */
  registry?: BlockRegistry
  /** Text metrics: `'table'` (default = `editorMetrics`, what the editor paints since LO6; ±5% per line at
   *  p95), `'estimate'` (the old average-width heuristic), or a provider. */
  metrics?: 'table' | 'estimate' | MeasureTextProvider
  /** AC1 — a deck style's knob defaults, filled under authored props as `compileSlide` does. */
  blockDefaults?: DeckStyle['blockDefaults']
  /** CMP2 — the slide's background (the slide's own, else its style master's). With `theme`, the
   *  blocks are laid out on it as the editor lays them out (their ink solves against it) and
   *  `contrast/low` composites down to it. Absent (and no theme): white. */
  background?: Paint
  /** CMP2 — the deck theme (`analyzeDeck` passes it): its background when the slide has none, and
   *  `theme:` colour tokens. */
  theme?: DeckTheme
  /** CMP2 — the deck's motion style (the slide's own wins), for the motion lints. */
  motionStyle?: MotionStyle
  /** CMP2 — the deck style's family (`accent/overuse` budget). */
  family?: DeckStyle['family']
  /** CMP2 — the slide was written by the LLM (the AI pipeline's S4.1 sets it; the CLI flag is
   *  `--llm`): `nesting/too-deep` holds it to 3 authored levels. */
  llmAuthored?: boolean
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Constants                                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Rounding slack for region re-flow / gap math (same as `collision.spec.ts`). */
const TOL = 1
/** Content may leave its box by this much before it is an overflow (sub-pixel + rounding). */
const OVERFLOW_TOL = 2
/** Minimum text ∩ text area (units²) that counts as a collision. */
const MIN_TEXT_COLLISION = 4
/** CMP2: nested-child lines printed per block in the text report. */
const MAX_CHILD_LINES = 12
/** ASCII map cell size in slide units (48×27 on a 1920×1080 frame). */
export const MAP_CELL = 40

/**
 * LO5 calibration (browser vs report on the 4 fixture decks, 289 blocks; layout-oracle §3 LO5).
 * Painted height error at the 95th percentile: layout kind 0.5% (0.7 units) once the editor and
 * the report wrap text the same way, html kind (export poster vs live DOM) 4.4% (20 units) —
 * since LO7 an html template paints its poster (`posterGeometry`): every part within 1.1 units.
 * The near-threshold margin is a multiple of that error, never less than a few units.
 */
export const NEAR_MARGIN: Record<MeasureConfidence, { share: number; min: number }> = {
  high: { share: 0.02, min: 4 },
  medium: { share: 0.05, min: 12 },
  low: { share: 0.1, min: 24 },
}
/** Text-width error at the 95th percentile (`tableMetrics` vs Chromium, 1287 lines): +5%. */
const WIDTH_ERROR = 0.05

/** LO5b thresholds (conservative; on the fixtures they fire on ~1 slide in 8). */
const UNBALANCED_MARGIN = 0.4 // empty band below/right of the content, share of the frame
const UNBALANCED_FREE = 0.6 // ... and at least this share of the frame is free
const CROWDED_FREE = 0.1
const EMPTY_REGION_AREA = 0.08 // a declared region this big (share of the frame) left empty

const MINIMAL_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#ffffff' },
  luminance: 1,
  overImage: false,
}

/** CMP1: what a block over a layered image backdrop sits on (as `surfaceFromBackground` for an
 *  image background: luminance unknowable, `overImage: true`). */
const IMAGE_SURFACE: SurfaceContext = imageSurface()

/** CMP1: the nested blocks the engine dropped (`lint/depth-overflow` groups), by id and type. */
function droppedBlocks(root: LayoutNode): Array<{ id?: string; type?: string }> {
  const out: Array<{ id?: string; type?: string }> = []
  const walk = (n: LayoutNode): void => {
    if (n.k === 'host' && n.poster) walk(n.poster)
    if (n.k !== 'group') return
    if (n.part === 'lint/depth-overflow') out.push({ ...(n.blockId ? { id: n.blockId } : {}), ...(n.type ? { type: n.type } : {}) })
    n.children.forEach(walk)
  }
  walk(root)
  return out
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Layer policy (LO2 plugs in here)                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** One side of an overlap, as `classifyOverlap` needs it. */
export interface OverlapParty {
  id: string
  layer: BlockLayer
  z: number
  /** Painted text leaves, slide coordinates. */
  text: Box[]
  /** LO2: painted union, slide coordinates. An overlay covers text only where it paints (a
   *  region overlay's box is the whole region). Absent = the box overlap is used. */
  painted?: Box | null
}

/**
 * Classify a box ∩ box overlap by layer policy (layout-oracle §LO2). Text ∩ text across blocks
 * is reported separately (`text/collision`): an error, `info` when one side is a backdrop behind (LO2.1).
 *
 * - content ∩ content → `layout/overlap` error (warning when the painted content does not meet);
 * - backdrop ∩ anything → allowed (`info`) when the backdrop paints *behind*, else error;
 * - overlay ∩ content → allowed (`info`) unless it covers a text leaf → `text/occluded` error;
 * - overlay ∩ overlay → warning.
 */
export function classifyOverlap(
  a: OverlapParty,
  b: OverlapParty,
  overlap: Box,
  paintedMeet: boolean
): { code: LayoutFindingCode; severity: LayoutFinding['severity']; note: string } {
  const [lo, hi] = a.z <= b.z ? [a, b] : [b, a]
  if (a.layer === 'backdrop' || b.layer === 'backdrop') {
    const backdrop = a.layer === 'backdrop' ? a : b
    const other = backdrop === a ? b : a
    if (a.layer === 'backdrop' && b.layer === 'backdrop') {
      return { code: 'layout/overlap', severity: 'info', note: 'two backdrops overlap' }
    }
    return backdrop.z < other.z
      ? { code: 'layout/overlap', severity: 'info', note: `backdrop ${backdrop.id} sits behind ${other.id} (intended)` }
      : { code: 'layout/overlap', severity: 'error', note: `backdrop ${backdrop.id} paints over ${other.id}` }
  }
  if (a.layer === 'overlay' && b.layer === 'overlay') {
    return { code: 'layout/overlap', severity: 'warning', note: 'two overlays overlap' }
  }
  if (a.layer === 'overlay' || b.layer === 'overlay') {
    const overlay = a.layer === 'overlay' ? a : b
    const content = overlay === a ? b : a
    const cover = overlay.painted ? intersect(overlay.painted, overlap) : overlap
    const covers = overlay.z > content.z && !!cover && content.text.some((t) => area(intersect(t, cover)) > MIN_TEXT_COLLISION)
    return covers
      ? { code: 'text/occluded', severity: 'error', note: `overlay ${overlay.id} covers text of ${content.id}` }
      : { code: 'layout/overlap', severity: 'info', note: `overlay ${overlay.id} over ${content.id} covers no text (intended)` }
  }
  return paintedMeet
    ? { code: 'layout/overlap', severity: 'error', note: `${hi.id} is placed on top of ${lo.id}` }
    : { code: 'layout/overlap', severity: 'warning', note: `boxes of ${lo.id} and ${hi.id} overlap, painted content does not (yet)` }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Geometry helpers                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

function intersect(a: Box, b: Box): Box | null {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  if (x2 <= x1 || y2 <= y1) return null
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

function area(b: Box | null): number {
  return b ? b.width * b.height : 0
}

function shrink(b: Box, t: number): Box {
  return { x: b.x + t, y: b.y + t, width: Math.max(0, b.width - 2 * t), height: Math.max(0, b.height - 2 * t) }
}

function offset(b: Box, dx: number, dy: number): Box {
  return { x: b.x + dx, y: b.y + dy, width: b.width, height: b.height }
}

const r = Math.round

function fmtBox(b: Box): string {
  return `${r(b.x)},${r(b.y)} ${r(b.width)}x${r(b.height)}`
}

function letterFor(i: number): string {
  return i < 26 ? String.fromCharCode(65 + i) : '*'
}

function providerFor(metrics: AnalyzeSlideOptions['metrics']): { provider: MeasureTextProvider; name: string } {
  if (typeof metrics === 'function') return { provider: metrics, name: 'custom' }
  if (metrics === 'estimate') return { provider: estimateMetrics, name: 'estimate' }
  return { provider: editorMetrics, name: 'table' }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* analyzeSlide                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

interface Placed {
  block: BlockSpec
  path: string
  region: string
  outOfFlow?: true
}

/**
 * Analyze one slide's geometry. Never throws on a well-formed `SlideSpec`: a block whose layout
 * throws is reported (`block/layout-failed`, confidence `low`) instead.
 */
export function analyzeSlide(authored: SlideSpec, opts: AnalyzeSlideOptions = {}): LayoutReport {
  const fill = (b: BlockSpec): BlockSpec => applyStyleBlockDefaults(b, opts.blockDefaults).block
  const spec: SlideSpec = opts.blockDefaults
    ? {
        ...authored,
        regions: Object.fromEntries(Object.entries(authored.regions ?? {}).map(([r, bs]) => [r, (bs ?? []).map(fill)])),
        ...(authored.free ? { free: authored.free.map((e) => ({ ...e, block: fill(e.block) })) } : {}),
      }
    : authored
  const frame = opts.frame ?? { width: 1920, height: 1080 }
  const tokens = opts.tokens ?? resolveTokens(DEFAULT_DECK_THEME)
  const registry = opts.registry ?? defaultBlockRegistry()
  const { provider, name: metricsName } = providerFor(opts.metrics)
  const gap = tokens.space.md

  // 1. Compile exactly as the editor does — the boxes below are the editor's boxes.
  const compiled = compileSlide(spec, frame, tokens, registry, opts.motionStyle ? { motionStyle: opts.motionStyle } : undefined)
  const layoutDef =
    getSlideLayout(spec.layout as Parameters<typeof getSlideLayout>[0]) ?? SLIDE_LAYOUTS.find((l) => l.id === 'blank')
  const regions = layoutDef ? layoutDef.compile(frame, tokens) : {}

  // 2. Pair compiled shapes with their specs (same order `compileSlide` emits them: region
  //    backdrops, stacked region blocks, free[], region overlays — LO2).
  const placed: Placed[] = []
  const split = splitLayeredBlocks(spec)
  const layeredPlaced = (list: NonNullable<typeof split>['backdrops']) =>
    list
      .filter((l) => regions[l.region])
      .map((l) => ({ block: l.block, path: `regions.${l.region}[${l.index}]`, region: l.region, outOfFlow: true as const }))
  if (split) placed.push(...layeredPlaced(split.backdrops))
  for (const [regionName, blocks] of Object.entries(spec.regions)) {
    if (!regions[regionName] || blocks.length === 0) continue
    blocks.forEach((block, i) => {
      if (split && (block.layer === 'backdrop' || block.layer === 'overlay')) return
      placed.push({ block, path: `regions.${regionName}[${i}]`, region: regionName })
    })
  }
  const free = spec.free ?? []
  free.forEach((entry, i) => placed.push({ block: entry.block, path: `free[${i}]`, region: 'free' }))
  if (split) placed.push(...layeredPlaced(split.overlays))

  const findings: LayoutFinding[] = []
  const visual: VisualCheck[] = []
  const intrinsicSizeCache = new Map<string, Size>()
  const blocks: BlockReport[] = []
  const design: DesignBlock[] = []

  // AC4: pair by block id first — `compileSlide` moves a free backdrop under the flow (LO8), so
  // its shape is no longer at the free block's index; by order only when ids are missing/repeated.
  const byId = new Map<string, Placed[]>()
  for (const p of placed) if (p.block.id) byId.set(p.block.id, [...(byId.get(p.block.id) ?? []), p])
  const used = new Set<Placed>()
  compiled.shapes.forEach((shape, i) => {
    const metaId = (shape.props[BLOCK_PROP_KEY] as { id?: string } | undefined)?.id
    const cands = metaId ? byId.get(metaId) : undefined
    const p = cands && cands.length === 1 && !used.has(cands[0]) ? cands[0] : placed[i]
    if (!p) return
    used.add(p)
    const meta = shape.props[BLOCK_PROP_KEY] as { id?: string } | undefined
    const id = meta?.id ?? p.block.id
    const box: Box = { x: shape.point[0], y: shape.point[1], width: shape.size[0], height: shape.size[1] }
    const def = registry.get(p.block.type)
    const base = {
      letter: letterFor(blocks.length),
      id,
      path: p.path,
      type: p.block.type,
      region: p.region,
      layer: blockLayer(p.block, def),
      ...(p.outOfFlow ? { outOfFlow: p.outOfFlow } : {}),
      ...(p.block.bleed === true && blockLayer(p.block, def) === 'backdrop' ? { bleed: true as const } : {}),
      z: shape.childIndex,
      box,
    }

    if (!def) {
      findings.push({
        code: 'block/unregistered',
        severity: 'error',
        blockIds: [id],
        message: `${id}: block type "${p.block.type}" is not registered; nothing renders.`,
        fix: 'use a type from the capability index',
      })
      blocks.push({
        ...base,
        natural: { width: box.width, height: 0 },
        elastic: false,
        painted: null,
        contentOverflow: { dx: 0, dy: 0 },
        text: [],
        confidence: 'low',
        reason: 'unregistered block type',
      })
      return
    }

    // CMP1: a block over a layered image backdrop (`$block.overImage`) sits on a photo.
    const overImage = (shape.props[BLOCK_PROP_KEY] as { overImage?: boolean } | undefined)?.overImage === true
    // CMP2: on the slide's real background (as the editor lays it out), when the deck is known.
    const pageSurface =
      opts.theme || opts.background
        ? surfaceFromBackground(opts.background, box, [frame.width, frame.height], opts.theme)
        : MINIMAL_SURFACE
    const ctx = createLayoutContext({
      box: { width: box.width, height: box.height },
      tokens,
      surface: overImage ? IMAGE_SURFACE : pageSurface,
      ...(opts.theme ? { theme: opts.theme } : {}),
      registry,
      measureText: provider,
      intrinsicSizeCache,
      ...(p.block.style ? { style: p.block.style } : {}),
      ...(opts.blockDefaults ? { blockDefaults: opts.blockDefaults } : {}),
    })
    const props = p.block.props as Record<string, unknown>
    const measure = measureBlock(def, props, box.width, ctx, { height: box.height })

    // Re-lay at the final box: this is what paints.
    let painted: Box | null = null
    let text: TextLeafReport[] = []
    let failed: string | undefined
    let dropped: Array<{ id?: string; type?: string }> = []
    let inspection: BlockInspection | undefined
    let root: LayoutNode | undefined
    try {
      root = layoutBlock(def, props, ctx)
      dropped = droppedBlocks(root)
      const collected = collectPaintedLeaves(root, { width: box.width, height: box.height })
      const local = paintedBounds(collected)
      painted = local ? offset(local, box.x, box.y) : null
      text = collected.text.map((t) => toSlideText(t, box))
      // CMP2: the authored nested children, and who owns each text leaf.
      inspection = inspectBlock(root, box, p.block, registry)
      if (inspection.textOwners.length === text.length) {
        text = text.map((t, k) => (inspection!.textOwners[k] !== p.block.id ? { ...t, block: inspection!.textOwners[k] } : t))
      }
      // LO5/LO6: the DOM paints the editor's line breaks (`editorMetrics`) verbatim. When this report
      // re-lays with another provider and the two disagree, the screen is not what this report says —
      // a screenshot is the only ground truth. With the default provider (= the editor's) the check
      // cannot fire and is skipped.
      if (provider !== editorMetrics && !collected.posterHost && !collected.opaqueHost) {
        const editor = editorTextCheck(def, props, ctx, box, provider, metricsName, text, registry, opts.blockDefaults)
        if (editor) visual.push({ blockId: id, reason: editor })
      }
    } catch (err) {
      failed = err instanceof Error ? err.message : String(err)
    }

    let capacity: CapacityReport | undefined
    if (def.capacity) {
      try {
        capacity = def.capacity(props, { width: box.width, height: box.height }, ctx)
      } catch {
        capacity = undefined
      }
    }

    const contentOverflow = painted
      ? {
          dx: Math.max(0, painted.x + painted.width - (box.x + box.width), box.x - painted.x),
          dy: Math.max(0, painted.y + painted.height - (box.y + box.height), box.y - painted.y),
        }
      : { dx: 0, dy: 0 }

    const confidence: MeasureConfidence = failed ? 'low' : measure.confidence
    const reason = failed ? `layout threw: ${failed}` : measure.reason
    blocks.push({
      ...base,
      natural: measure.natural,
      elastic: measure.elastic,
      painted,
      contentOverflow,
      text,
      ...(capacity ? { capacity } : {}),
      confidence,
      ...(reason ? { reason } : {}),
      ...(inspection && inspection.subs.length ? { children: subReports(inspection, root as LayoutNode) } : {}),
    })
    design.push({
      id,
      type: p.block.type,
      layer: base.layer,
      z: base.z,
      styleOwned: id.startsWith(STYLE_MASTER_PREFIX) && base.layer === 'backdrop',
      box,
      spec: p.block,
      motion: shapeToRevealBlock(shape)?.motion,
      ...(root ? { root } : {}),
      ...(inspection ? { inspection } : {}),
      text,
    })
    if (dropped.length) {
      const names = dropped.map((d) => `${d.id ?? '?'} (${d.type ?? 'unknown type'})`)
      findings.push({
        code: 'block/dropped',
        severity: 'error',
        blockIds: [id],
        message: `${id}: ${names.join(', ')} ${dropped.length === 1 ? 'is' : 'are'} nested deeper than ${MAX_NESTING_DEPTH} levels and not drawn.`,
        fix: `flatten ${id}: move the deepest blocks up a level or into a region of their own`,
      })
    }
    if (failed) {
      findings.push({
        code: 'block/layout-failed',
        severity: 'error',
        blockIds: [id],
        message: `${id}: layout threw (${failed}); the block renders as an empty box.`,
        fix: 'check its props against the block schema',
      })
    }
  })

  // 3. Compiler findings (region overflow / unknown region), carried through.
  for (const f of compiled.findings) findings.push(fromCompileFinding(f, blocks, regions))
  const regionFree = regionFreeSpace(regions, blocks, gap)
  // The compiler flags one block taller than its region; a region overfilled by a *stack* of
  // blocks that each fit is re-flowed silently. Report that too.
  for (const [name, rb] of Object.entries(regions)) {
    const inRegion = blocks.filter((b) => b.region === name && !b.outOfFlow)
    if (inRegion.length < 2 || compiled.findings.some((f) => f.rule === 'region/overflow' && f.region === name)) continue
    const used = inRegion.reduce((sum, b) => sum + b.box.height, 0) + (inRegion.length - 1) * gap
    const over = Math.ceil(used - rb.height)
    if (over <= TOL) continue
    const fillers = inRegion.filter((b) => b.elastic)
    const wordiest = inRegion.reduce((m, b) => (textHeight(b) > textHeight(m) ? b : m))
    const cut = textHeight(wordiest) > 0 ? cutTextFix(wordiest, over) : undefined
    const move = roomyRegion(regionFree, name, r(wordiest.box.height))
    const fix =
      fillers.length > 0
        ? `${fillers.map((b) => b.id).join(', ')} fill${fillers.length === 1 ? 's' : ''} the whole region height on ${fillers.length === 1 ? 'its' : 'their'} own: give ${fillers[0].id} a region of its own (another layout) or drop a block from \`${name}\``
        : [cut, move ? `move ${wordiest.id} to region \`${move[0]}\` (free ${move[1]})` : undefined, `drop a block from \`${name}\``]
            .filter(Boolean)
            .join(' or ')
    findings.push({
      code: 'region/overflow',
      severity: 'warning',
      blockIds: inRegion.map((b) => b.id),
      message: `region \`${name}\` stacks ${inRegion.length} blocks = ${r(used)} units, ${over} more than its ${r(rb.height)} height; everything below is pushed down.`,
      fix,
    })
  }

  // A block the compiler's re-flow moved out of its own region entirely. (The re-flow stacks
  // every non-empty region by y, so an overfull `left` also pushes `right` below it.)
  const overfull = new Set(
    findings.filter((f) => f.code === 'region/overflow').flatMap((f) => {
      const c = compiled.findings.find((x) => x.rule === 'region/overflow' && x.blockId && f.blockIds.includes(x.blockId))
      return c?.region ? [c.region] : blocks.filter((b) => f.blockIds.includes(b.id)).map((b) => b.region)
    })
  )
  for (const b of blocks) {
    const rb = regions[b.region]
    if (!rb || b.outOfFlow) continue
    const below = b.box.y > rb.y + rb.height - TOL
    const above = b.box.y + b.box.height < rb.y + TOL
    if (!below && !above) continue
    const culprits = [...overfull].filter((n) => n !== b.region)
    findings.push({
      code: 'region/displaced',
      severity: 'warning',
      blockIds: [b.id],
      message: `${b.id} was moved out of its region \`${b.region}\` (y ${r(rb.y)}-${r(rb.y + rb.height)}) to y ${r(b.box.y)} by the compiler's region re-flow.`,
      fix:
        culprits.length > 0
          ? `fix the overflow of region ${culprits.map((n) => `\`${n}\``).join(', ')}; ${b.id} then returns to \`${b.region}\``
          : `shrink the blocks above ${b.id} in \`${b.region}\``,
    })
  }

  // 4. Per-block findings.
  for (const b of blocks) {
    const regionCount = b.region === 'free' ? 1 : blocks.filter((x) => x.region === b.region && !x.outOfFlow).length
    blockFindings(b, frame, regionFree, regionCount, findings)
  }

  // 5. Pairwise: box overlaps (layer policy) and text collisions.
  // AC4: a style master's backdrop (`style:` id, from `analyzeDeck`) belongs to the style: it sits
  // under everything by construction, so it is left out of the pairwise checks and of the slide's
  // margins / free space (a full-frame mesh is not content).
  const styleOwned = (b: BlockReport) => b.id.startsWith(STYLE_MASTER_PREFIX) && b.layer === 'backdrop'
  // CMP1: a bleeding backdrop is decoration cut by the frame — not content for the margins.
  const marginless = (b: BlockReport) => styleOwned(b) || b.bleed === true
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (styleOwned(blocks[i]) || styleOwned(blocks[j])) continue
      pairFindings(blocks[i], blocks[j], findings)
    }
  }

  // 5b. CMP2: inside compositions — sibling pairs among a container's children (overlap, text
  // collision, occlusion by layer), a child's own text overflow, then the design checks.
  for (const b of blocks) if (b.children) childFindings(b, findings)
  const background = (pt: { x: number; y: number }): Background => slideBackgroundAt(pt, frame, opts)
  for (const f of designFindings(design, { frame, tokens, registry, background, ...(opts.family ? { family: opts.family } : {}), ...(opts.llmAuthored ? { llmAuthored: true } : {}) })) findings.push(f)

  // 6. Slide summary numbers.
  const paintedAll = blocks.filter((b) => !marginless(b)).map((b) => b.painted).filter((b): b is Box => b !== null)
  const all = unionBox(paintedAll)
  const margins = all
    ? {
        top: r(all.y),
        right: r(frame.width - (all.x + all.width)),
        bottom: r(frame.height - (all.y + all.height)),
        left: r(all.x),
      }
    : { top: frame.height, right: frame.width, bottom: frame.height, left: frame.width }
  const freeSpace = freeRatio(frame, paintedAll)

  // 7. LO5b composition hints (info/warning, from the summary numbers).
  // AC1.5: with no authored `role`, a slide made only of cover / divider / closing blocks reads as
  // that role (a left-aligned divider is a design choice, as with `role: 'section'`).
  const ROLE_BY_CATEGORY: Record<string, SlideSpec['role']> = { cover: 'cover', divider: 'section', closing: 'closing' }
  const blockRoles = new Set(blocks.filter((b) => b.layer !== 'backdrop').map((b) => ROLE_BY_CATEGORY[registry.get(b.type)?.category ?? ''] ?? 'content'))
  const inferredRole = blockRoles.size === 1 ? [...blockRoles][0] : undefined
  compositionFindings(frame, regions, blocks, margins, freeSpace, spec.role ?? (inferredRole === 'content' ? undefined : inferredRole), findings, spec.layout === 'full-bleed')

  // 8. LO5: what still needs a screenshot.
  for (const b of blocks) {
    if (b.confidence !== 'high') visual.push({ blockId: b.id, reason: `confidence ${b.confidence}: ${b.reason ?? 'geometry uncertain'}` })
  }
  visual.push(...nearThresholdChecks(blocks, frame))
  const needsVisualCheck = mergeVisualChecks(visual, blocks)

  return {
    slideId: spec.id,
    layout: compiled.layout,
    frame,
    metrics: metricsName,
    regions,
    blocks,
    findings: sortFindings(findings),
    margins,
    freeSpace,
    needsVisualCheck,
  }
}

/**
 * Analyze every slide of a deck with the deck's own frame, theme and token overrides.
 */
export function analyzeDeck(
  deck: DeckSpec,
  opts: Omit<AnalyzeSlideOptions, 'frame' | 'tokens'> = {}
): LayoutReport[] {
  const frame = resolveDeckFrame(deck.aspect)
  const tokens = resolveTokens(resolveDeckTheme(deck.theme, deck.style), deckSpecTokens(deck))
  // AC1: the style's knob defaults are part of what the editor compiles.
  const style = getDeckStyle(deck.style)
  const blockDefaults = style?.blockDefaults
  // AC4: a style master's blocks (mesh, grain, motifs) are on every page it applies to
  // (`deckSpecToDocument`); the report sees them as free backdrop blocks under the slide's flow.
  const masters = Object.fromEntries(styleMasters(style).map((m) => [m.name, m]))
  const withMaster = (s: SlideSpec): SlideSpec => {
    const id = styleMasterFor(style, s)
    const master = id ? masters[id] : undefined
    if (!id || !master || !Object.keys(master.blocks).length) return s
    const shapes = resolveMaster(id, masters, frame, tokens)?.shapes ?? []
    const names = Object.keys(master.blocks).filter((k) => !isEditorOnly(master.blocks[k].type))
    const free = names.map((name, i) => ({
      block: { ...master.blocks[name], id: `${STYLE_MASTER_PREFIX}${name}`, layer: 'backdrop' as const },
      box: { x: shapes[i].point[0], y: shapes[i].point[1], width: shapes[i].size[0], height: shapes[i].size[1] },
    }))
    return { ...s, free: [...(s.free ?? []), ...free] }
  }
  // CMP2: the page background (the slide's own, else its style master's) and the deck theme, so the
  // report lays blocks out on the real page and `contrast/low` composites down to it.
  const theme = resolveDeckTheme(deck.theme, deck.style)
  const motionStyle = deck.motionStyle ?? style?.motionStyle
  const backgroundOf = (s: SlideSpec): Paint | undefined => {
    if (s.background) return s.background
    const id = styleMasterFor(style, s)
    return id ? masters[id]?.background : undefined
  }
  return deck.slides.map((s) => {
    const background = backgroundOf(s)
    return analyzeSlide(withMaster(s), {
      ...opts,
      frame,
      tokens,
      theme,
      ...(background ? { background } : {}),
      ...(motionStyle ? { motionStyle } : {}),
      ...(style ? { family: style.family } : {}),
      ...(blockDefaults ? { blockDefaults } : {}),
    })
  })
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* CMP2 — inside compositions                                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** The slide background at a point (`null` over a photo): the slide's own paint, else the theme's. */
function slideBackgroundAt(pt: { x: number; y: number }, frame: Size, opts: AnalyzeSlideOptions): Background {
  const raw = opts.background
  if (raw) {
    if ((raw as { type: string }).type === 'image') return null
    // `theme:accent1`-style colours resolve against the deck theme (a style master's section page)
    const col = (c: string) => resolveThemeColor(c, opts.theme) ?? c
    const bg: Paint = raw.type === 'solid' ? { type: 'solid', color: col(raw.color) } : { ...raw, stops: raw.stops.map((st) => ({ ...st, color: col(st.color) })) }
    const c = paintAt(bg, { x: 0, y: 0, width: frame.width, height: frame.height }, pt)
    if (c) return { rgb: c.rgb }
  }
  const themeBg = parseInk(opts.theme?.colors.background)
  if (opts.theme && themeBg) return { rgb: themeBg.rgb }
  return { rgb: { r: 255, g: 255, b: 255 } }
}

/** Sub-block reports of an inspection: painted extent per child (surfaces included). */
function subReports(ins: BlockInspection, _root: LayoutNode): SubBlockReport[] {
  return ins.subs.map((s) => {
    const mine = new Set<number>()
    ins.owners.forEach((o, i) => {
      if (o === s.path || o.startsWith(s.path + '/')) mine.add(i)
    })
    const boxes = [
      ...ins.ops.filter((op) => op.owner !== undefined && mine.has(op.owner)).map((op) => op.box),
      ...ins.inks.filter((ink) => ink.owner !== undefined && mine.has(ink.owner)).map((ink) => ink.box),
    ]
    return { id: s.id, path: s.path, type: s.type, parent: s.parent, level: s.level, layer: s.layer, box: s.box, painted: unionBox(boxes) }
  })
}

/**
 * CMP2 — findings among a block's nested children: every pair of siblings (overlap by layer
 * policy, text collision, occlusion — the same rules as slide-level blocks, child z = paint order),
 * and a child whose own text runs out of its box (when the block as a whole does not already).
 */
function childFindings(b: BlockReport, out: LayoutFinding[]): void {
  const kids = b.children ?? []
  const textOf = (path: string) => b.text.filter((t) => t.block === path || (t.block ?? '').startsWith(path + '/'))
  const asReport = (c: SubBlockReport, z: number): BlockReport => ({
    letter: b.letter,
    id: c.path,
    path: c.path,
    type: c.type,
    region: b.region,
    layer: c.layer,
    z,
    box: c.box,
    natural: { width: c.box.width, height: c.box.height },
    elastic: false,
    painted: c.painted,
    contentOverflow: c.painted
      ? {
          dx: Math.max(0, c.painted.x + c.painted.width - (c.box.x + c.box.width), c.box.x - c.painted.x),
          dy: Math.max(0, c.painted.y + c.painted.height - (c.box.y + c.box.height), c.box.y - c.painted.y),
        }
      : { dx: 0, dy: 0 },
    text: textOf(c.path),
    confidence: b.confidence,
  })
  const byParent = new Map<string, SubBlockReport[]>()
  for (const c of kids) byParent.set(c.parent, [...(byParent.get(c.parent) ?? []), c])
  const blockSpills = b.contentOverflow.dx > OVERFLOW_TOL || b.contentOverflow.dy > OVERFLOW_TOL
  for (const sibs of byParent.values()) {
    const reps = sibs.map((c, i) => asReport(c, i))
    for (let i = 0; i < reps.length; i++) for (let j = i + 1; j < reps.length; j++) pairFindings(reps[i], reps[j], out)
    if (blockSpills) continue
    for (const c of reps) {
      const bottom = c.box.y + c.box.height
      const spill = c.text.filter((t) => t.painted.y + t.painted.height > bottom + OVERFLOW_TOL).sort((p, q) => q.painted.y + q.painted.height - (p.painted.y + p.painted.height))
      if (!spill.length) continue
      const t = spill[0]
      const need = Math.ceil(t.painted.y + t.painted.height - bottom)
      out.push({
        code: 'text/overflow',
        severity: 'error',
        blockIds: [b.id],
        message: `${c.id} \`${textName(t)}\` needs +${need} units: ${t.lines} lines × ${r(t.lineHeight)} in a ${r(c.box.height)}-tall box.`,
        fix: cutLeafFix(t, need) ?? `give ${c.id} +${need} height`,
      })
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Finding builders                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

function toSlideText(t: TextLeafMeasure, box: Box): TextLeafReport {
  return {
    ...(t.part !== undefined ? { part: t.part } : {}),
    ...(t.propPath !== undefined ? { propPath: t.propPath } : {}),
    lines: t.lines,
    lineHeight: t.lineHeight,
    fontSize: t.fontSize,
    scale: t.scale,
    maxLineWidth: t.maxLineWidth,
    chars: t.chars,
    charsPerLine: t.charsPerLine,
    box: offset(t.box, box.x, box.y),
    painted: offset(t.painted, box.x, box.y),
  }
}

function textName(t: TextLeafReport): string {
  return t.propPath ?? t.part ?? 'text'
}

function fromCompileFinding(f: CompileFinding, blocks: BlockReport[], regions: Record<string, Box>): LayoutFinding {
  const code: LayoutFindingCode =
    f.rule === 'region/overflow' ? 'region/overflow' : f.rule === 'region/unknown' ? 'region/unknown' : 'block/unregistered'
  const out: LayoutFinding = {
    code,
    severity: f.level,
    blockIds: f.blockId ? [f.blockId] : [],
    message: f.message + (f.suggestion ? ` ${f.suggestion}` : ''),
  }
  if (f.rule === 'region/overflow' && f.blockId && f.region && regions[f.region]) {
    const b = blocks.find((x) => x.id === f.blockId)
    const over = b ? Math.ceil(b.box.height - regions[f.region].height) : 0
    if (b && over > 0) {
      const cut = textHeight(b) > 0 ? cutTextFix(b, over) : undefined
      out.fix =
        `shrink ${b.id} by ${over} units (region \`${f.region}\` is ${r(regions[f.region].height)} tall; everything below is pushed down by that much)` +
        (cut ? `: ${cut}` : '')
    }
  }
  return out
}

/** Total painted text height of a block (lines × line-height over its text leaves). */
function textHeight(b: BlockReport): number {
  return b.text.reduce((sum, t) => sum + t.lines * t.lineHeight, 0)
}

/** "cut `x` to ≤ K lines (~C chars/line, ≤ N chars)" — the remedy for `need` units of text;
 *  `undefined` when the text is already one line (cutting cannot help). */
function cutLeafFix(t: TextLeafReport, need: number): string | undefined {
  if (t.lines <= 1) return undefined
  const keep = Math.max(1, t.lines - Math.ceil(need / t.lineHeight))
  return `cut \`${textName(t)}\` to ≤ ${keep} line${keep === 1 ? '' : 's'} (~${t.charsPerLine} chars/line, ≤ ${keep * t.charsPerLine} chars; now ${t.lines} lines, ${t.chars} chars)`
}

/** The same remedy aimed at the block's tallest text leaf. */
function cutTextFix(b: BlockReport, need: number): string | undefined {
  if (b.text.length === 0) return undefined
  const t = b.text.reduce((m, x) => (x.lines * x.lineHeight > m.lines * m.lineHeight ? x : m))
  return cutLeafFix(t, need)
}

/** Vertical room left in each region of the layout (free blocks ignored). */
function regionFreeSpace(regions: Record<string, Box>, blocks: BlockReport[], gap: number): Record<string, number> {
  const free: Record<string, number> = {}
  for (const [name, rb] of Object.entries(regions)) {
    const inRegion = blocks.filter((b) => b.region === name && !b.outOfFlow)
    const used = inRegion.reduce((s, b) => s + b.box.height, 0) + Math.max(0, inRegion.length - 1) * gap
    free[name] = r(rb.height - used - (inRegion.length > 0 ? gap : 0))
  }
  return free
}

/** The other region with the most free room that could take `need` units, if any. */
function roomyRegion(regionFree: Record<string, number>, own: string, need: number): [string, number] | undefined {
  let best: [string, number] | undefined
  for (const [name, f] of Object.entries(regionFree)) {
    if (name === own || f < need) continue
    if (!best || f > best[1]) best = [name, f]
  }
  return best
}

function blockFindings(
  b: BlockReport,
  frame: Size,
  regionFree: Record<string, number>,
  regionCount: number,
  out: LayoutFinding[]
): void {
  // Frame overflow (F5.3): the box or its painted content leaves the 1920×1080 frame.
  // CMP1: a bleeding backdrop (`bleed: true`) may.
  const extent = (b.painted && unionBox([b.box, b.painted])) || b.box
  const past = {
    left: r(-extent.x),
    top: r(-extent.y),
    right: r(extent.x + extent.width - frame.width),
    bottom: r(extent.y + extent.height - frame.height),
  }
  const edges = (Object.entries(past) as Array<[string, number]>).filter(([, v]) => v > TOL)
  if (edges.length > 0 && !b.bleed) {
    out.push({
      code: 'slide/overflow',
      severity: 'error',
      blockIds: [b.id],
      message: `${b.id} runs off the frame: ${edges.map(([e, v]) => `${v} past ${e}`).join(', ')}.`,
      fix:
        b.elastic && regionCount > 1
          ? `${b.id} fills its whole region height and region \`${b.region}\` stacks ${regionCount} blocks: give it a region of its own (another layout) or remove a block from \`${b.region}\``
          : `free ${Math.max(...edges.map(([, v]) => v))} units: shorten ${b.id}, or shrink/move the blocks above it`,
    })
  }

  // Content overflow: painted content leaves the block's own box.
  const { dy, dx } = b.contentOverflow
  if (b.painted && (dy > OVERFLOW_TOL || dx > OVERFLOW_TOL)) {
    const boxBottom = b.box.y + b.box.height
    const spilling = b.text
      .filter((t) => t.painted.y + t.painted.height > boxBottom + OVERFLOW_TOL)
      .sort((p, q) => q.painted.y + q.painted.height - (p.painted.y + p.painted.height))
    const need = Math.ceil(dy)
    if (spilling.length > 0 && dy > OVERFLOW_TOL) {
      const t = spilling[0]
      const move = roomyRegion(regionFree, b.region, r(b.natural.height))
      out.push({
        code: 'text/overflow',
        severity: 'error',
        blockIds: [b.id],
        message: `${t.block ?? b.id} \`${textName(t)}\` needs +${need} units: ${t.lines} lines × ${r(t.lineHeight)} in a ${r(b.box.height)}-tall box.`,
        fix:
          [cutLeafFix(t, need) ?? `give ${b.id} +${need} height`, move ? `move ${b.id} to region \`${move[0]}\` (free ${move[1]})` : undefined]
            .filter(Boolean)
            .join(' or '),
      })
    } else {
      out.push({
        code: 'content/overflow',
        severity: 'warning',
        blockIds: [b.id],
        message: `${b.id} paints ${dy > OVERFLOW_TOL ? `${need} units below` : ''}${dy > OVERFLOW_TOL && dx > OVERFLOW_TOL ? ' and ' : ''}${dx > OVERFLOW_TOL ? `${Math.ceil(dx)} units beside` : ''} its ${r(b.box.width)}x${r(b.box.height)} box.`,
        fix: `give ${b.id} ${dy > OVERFLOW_TOL ? `${need} more units of height` : `${Math.ceil(dx)} more units of width`}, or fewer items`,
      })
    }
  }

  // Autofit already kicked in: the text fits only because it was shrunk.
  const shrunk = b.text.filter((t) => t.scale < 0.999)
  if (shrunk.length > 0) {
    const t = shrunk.reduce((m, x) => (x.scale < m.scale ? x : m))
    const fullLine = t.lineHeight / t.scale
    // One line that still shrank: the box is shorter than one full-size line, so shorter text
    // will not help — height will.
    const fix =
      t.lines === 1 && fullLine > t.box.height + OVERFLOW_TOL
        ? `the box is ${r(t.box.height)} tall for a ${r(fullLine)}-unit line: give ${b.id} +${Math.ceil(fullLine - t.box.height)} height or a smaller size token; shorter text will not help`
        : `shorten \`${textName(t)}\` to ≤ ${Math.max(1, Math.floor(t.chars * t.scale * t.scale))} chars (now ${t.chars}) for full size`
    out.push({
      code: 'text/shrunk',
      severity: 'info',
      blockIds: [b.id],
      message: `${b.id} \`${textName(t)}\` autofit to ${Math.round(t.scale * 100)}% (${r(t.fontSize)} units) to fit.`,
      fix,
    })
  }

  // capacity(): the block's own budget, when it defines one.
  if (b.capacity && !b.capacity.fits) {
    const over = Object.entries(b.capacity.budget).filter(([, v]) => v.used > v.max)
    const detail = over.map(([slot, v]) => `${slot} ${v.used}/${v.max} ${v.unit}`).join(', ')
    const remedy = b.capacity.remedy[0]
    out.push({
      code: 'capacity/exceeded',
      severity: 'warning',
      blockIds: [b.id],
      message: `${b.id} is over its own capacity${detail ? `: ${detail}` : ''}.`,
      fix:
        (over.length > 0 ? over.map(([slot, v]) => `${slot} ≤ ${v.max} ${v.unit}`).join(', ') : 'reduce content') +
        (remedy ? ` (block would ${remedy.kind}${remedy.kind === 'reflow' ? ` to ${remedy.to}` : ''})` : ''),
    })
  }
}

function pairFindings(a: BlockReport, b: BlockReport, out: LayoutFinding[]): void {
  // Box ∩ box, by layer policy.
  const boxOverlap = intersect(shrink(a.box, TOL), shrink(b.box, TOL))
  if (boxOverlap) {
    const paintedMeet = !!(a.painted && b.painted && intersect(shrink(a.painted, TOL), shrink(b.painted, TOL)))
    const cls = classifyOverlap(party(a), party(b), boxOverlap, paintedMeet)
    out.push({
      code: cls.code,
      severity: cls.severity,
      blockIds: [a.id, b.id],
      message: `${a.id} × ${b.id} boxes overlap ${r(boxOverlap.width)}x${r(boxOverlap.height)} at ${r(boxOverlap.x)},${r(boxOverlap.y)}: ${cls.note}.`,
      ...(cls.severity === 'info' ? {} : { fix: separationFix(a, b, boxOverlap) }),
    })
  } else if (a.painted && b.painted) {
    // Boxes are apart but content spills into the other block.
    const spill = intersect(shrink(a.painted, TOL), shrink(b.painted, TOL))
    if (spill && (a.contentOverflow.dy > OVERFLOW_TOL || b.contentOverflow.dy > OVERFLOW_TOL ||
      a.contentOverflow.dx > OVERFLOW_TOL || b.contentOverflow.dx > OVERFLOW_TOL)) {
      const spiller = a.contentOverflow.dy + a.contentOverflow.dx >= b.contentOverflow.dy + b.contentOverflow.dx ? a : b
      const other = spiller === a ? b : a
      out.push({
        code: 'layout/overlap',
        severity: 'error',
        blockIds: [spiller.id, other.id],
        message: `${spiller.id} overflows its box into ${other.id} (${r(spill.width)}x${r(spill.height)} at ${r(spill.x)},${r(spill.y)}).`,
        fix: `fix ${spiller.id}'s overflow (see its text/overflow); ${other.id} is not at fault`,
      })
    }
  }

  // Text leaf ∩ text leaf across blocks — an error, except under a backdrop (LO2.1): a backdrop's
  // text (a watermark) is designed to sit behind content text, so that is `info` when it is behind.
  let hits = 0
  let worst: Box | null = null
  for (const ta of a.text) {
    for (const tb of b.text) {
      const hit = intersect(ta.painted, tb.painted)
      if (area(hit) > MIN_TEXT_COLLISION) {
        hits++
        if (!worst || area(hit) > area(worst)) worst = hit
      }
    }
  }
  if (hits > 0 && worst) {
    const behind = backdropBehind(a, b)
    out.push({
      code: 'text/collision',
      severity: behind ? 'info' : 'error',
      blockIds: [a.id, b.id],
      message:
        `text of ${a.id} and ${b.id} overlaps in ${hits} place${hits === 1 ? '' : 's'} (worst ${r(worst.width)}x${r(worst.height)} at ${r(worst.x)},${r(worst.y)})` +
        (behind ? `: backdrop ${behind.id} sits behind (intended).` : '.'),
      ...(behind ? {} : { fix: separationFix(a, b, worst) }),
    })
  }
}

/** LO2.1 — the backdrop of a pair when exactly one side is a backdrop and it paints behind the other. */
function backdropBehind(a: BlockReport, b: BlockReport): BlockReport | undefined {
  if (a.layer === 'backdrop' && b.layer !== 'backdrop' && a.z < b.z) return a
  if (b.layer === 'backdrop' && a.layer !== 'backdrop' && b.z < a.z) return b
  return undefined
}

function party(b: BlockReport): OverlapParty {
  return { id: b.id, layer: b.layer, z: b.z, text: b.text.map((t) => t.painted), painted: b.painted }
}

/** The smaller of the two moves that separates `b` from `a` (down or sideways). */
function separationFix(a: BlockReport, b: BlockReport, overlap: Box): string {
  const [first, second] = a.box.y <= b.box.y ? [a, b] : [b, a]
  if (overlap.height <= overlap.width) {
    return `move ${second.id} down ${Math.ceil(overlap.height)} units, or shrink ${first.id} by ${Math.ceil(overlap.height)}`
  }
  return `move ${second.id} sideways ${Math.ceil(overlap.width)} units, or narrow ${first.id} by ${Math.ceil(overlap.width)}`
}

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 } as const

function sortFindings(f: LayoutFinding[]): LayoutFinding[] {
  // Stable sort by severity; insertion order (slide → blocks → pairs) breaks ties.
  return f
    .map((x, i) => [x, i] as const)
    .sort((p, q) => SEVERITY_ORDER[p[0].severity] - SEVERITY_ORDER[q[0].severity] || p[1] - q[1])
    .map(([x]) => x)
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* LO5 — when to screenshot                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

type TextNode = Extract<LayoutNode, { k: 'text' }>

function textNodes(n: LayoutNode, out: TextNode[] = []): TextNode[] {
  if (n.k === 'text') out.push(n)
  else if (n.k === 'group') for (const c of n.children) textNodes(c, out)
  return out
}

/**
 * Lay the block out the way the editor does (`editorMetrics`) and compare with the report's
 * text: a different line count, or an editor line whose real width (`provider`) runs past its
 * text box, means the screen differs from the report. Returns the reason, or `undefined`.
 */
function editorTextCheck(
  def: NonNullable<ReturnType<BlockRegistry['get']>>,
  props: Record<string, unknown>,
  ctx: ReturnType<typeof createLayoutContext>,
  box: Box,
  provider: MeasureTextProvider,
  providerName: string,
  report: TextLeafReport[],
  registry: BlockRegistry,
  blockDefaults?: DeckStyle['blockDefaults']
): string | undefined {
  if (report.length === 0) return undefined
  const editorCtx = createLayoutContext({
    box: { width: box.width, height: box.height },
    tokens: ctx.tokens,
    surface: ctx.surface,
    registry,
    measureText: editorMetrics,
    ...(ctx.style ? { style: ctx.style } : {}),
    ...(blockDefaults ? { blockDefaults } : {}),
  })
  const root = layoutBlock(def, props, editorCtx)
  const editor = collectPaintedLeaves(root, { width: box.width, height: box.height }).text
  if (editor.length !== report.length) {
    return `the editor lays its text out differently (${editor.length} text leaves on screen, ${report.length} here)`
  }
  for (let i = 0; i < editor.length; i++) {
    if (editor[i].lines !== report[i].lines) {
      return `the editor wraps \`${textName(report[i])}\` to ${editor[i].lines} line${editor[i].lines === 1 ? '' : 's'} on screen; the report's \`${providerName}\` metric needs ${report[i].lines}`
    }
  }
  let worst = 0
  let worstName = ''
  for (const n of textNodes(root)) {
    for (const line of n.lines) {
      if (!line.text.trim()) continue
      const over = provider(line.text.trimEnd(), n.style).width - n.box.width
      if (over > worst) {
        worst = over
        worstName = n.propPath ?? n.part ?? 'text'
      }
    }
  }
  if (worst > OVERFLOW_TOL + 1) {
    return `on screen a line of \`${worstName}\` paints ~${Math.ceil(worst)} units past its text box (per the report's \`${providerName}\` metric)`
  }
  return undefined
}

function nearMargin(b: BlockReport, extent: number): number {
  const m = NEAR_MARGIN[b.confidence]
  return Math.max(m.min, m.share * extent)
}

/**
 * Blocks whose painted content ends within the calibrated error margin of something it must not
 * cross: the frame edge, or the painted content of another block below it / beside it.
 * Elastic (fill) blocks are excluded (they reach their box edge by design), as are backdrops.
 */
function nearThresholdChecks(blocks: BlockReport[], frame: Size): VisualCheck[] {
  const out: VisualCheck[] = []
  for (const b of blocks) {
    const p = b.painted
    if (!p || b.elastic || b.layer === 'backdrop') continue
    const bottom = p.y + p.height
    const right = p.x + p.width
    let below = frame.height - bottom
    let belowWho = 'the frame bottom'
    let beside = frame.width - right
    let besideWho = 'the frame edge'
    for (const o of blocks) {
      const q = o.painted
      if (o === b || !q || o.layer === 'backdrop' || b.layer !== o.layer) continue
      const xOverlap = Math.min(right, q.x + q.width) - Math.max(p.x, q.x)
      const yOverlap = Math.min(bottom, q.y + q.height) - Math.max(p.y, q.y)
      if (xOverlap > 0 && q.y >= p.y + p.height / 2 && q.y - bottom < below) {
        below = q.y - bottom
        belowWho = o.id
      }
      if (yOverlap > 0 && q.x >= p.x + p.width / 2 && q.x - right < beside) {
        beside = q.x - right
        besideWho = o.id
      }
    }
    const marginY = nearMargin(b, p.height)
    // Width error scales with the widest text line (estimate lines are what the screen shows).
    const widest = b.text.reduce((m, t) => Math.max(m, t.maxLineWidth), 0)
    const marginX = widest > 0 ? Math.max(NEAR_MARGIN[b.confidence].min, WIDTH_ERROR * widest) : NEAR_MARGIN[b.confidence].min
    if (below >= -TOL && below < marginY && b.text.length > 0) {
      out.push({ blockId: b.id, reason: `content ends ${r(below)} units above ${belowWho} (error margin ${r(marginY)})` })
    } else if (beside >= -TOL && beside < marginX && widest > 0) {
      out.push({ blockId: b.id, reason: `text ends ${r(beside)} units before ${besideWho} (error margin ${r(marginX)})` })
    }
  }
  return out
}

/** One entry per block (first reason wins), in block order. */
function mergeVisualChecks(checks: VisualCheck[], blocks: BlockReport[]): VisualCheck[] {
  const first = new Map<string, string>()
  for (const c of checks) if (!first.has(c.blockId)) first.set(c.blockId, c.reason)
  return blocks.filter((b) => first.has(b.id)).map((b) => ({ blockId: b.id, reason: first.get(b.id) as string }))
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* LO5b — composition hints                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Findings about the composition rather than an error: a big empty band (`layout/unbalanced`),
 * a large declared region left empty (`region/empty`), almost no free space (`layout/crowded`).
 * Conservative thresholds (above); each carries a numeric fix.
 */
function compositionFindings(
  frame: Size,
  regions: Record<string, Box>,
  blocks: BlockReport[],
  margins: LayoutReport['margins'],
  freeSpace: number,
  role: SlideSpec['role'],
  out: LayoutFinding[],
  fullBleed = false
): void {
  const painting = blocks.filter((b) => b.painted && b.layer !== 'backdrop')
  if (painting.length === 0) return
  const pct = (v: number) => Math.round(v * 100)

  // Declared regions nobody uses.
  const used = new Set(blocks.map((b) => b.region))
  const emptyRegions = Object.entries(regions).filter(
    ([name, rb]) => !used.has(name) && rb.width * rb.height >= EMPTY_REGION_AREA * frame.width * frame.height
  )
  for (const [name, rb] of emptyRegions) {
    out.push({
      code: 'region/empty',
      severity: 'info',
      blockIds: [],
      message: `region \`${name}\` (${fmtBox(rb)}, ${pct((rb.width * rb.height) / (frame.width * frame.height))}% of the frame) has no block; it shows as empty space.`,
      fix: `put a block in \`${name}\` (${r(rb.width)}x${r(rb.height)} available) or pick a layout without it`,
    })
  }

  // A big empty band below / right of everything painted (backdrops included: a decoration is
  // composition too). Left-aligned cover/section/closing text is a design choice, so the side
  // check skips those roles.
  if (freeSpace >= UNBALANCED_FREE) {
    const { top, bottom, left, right } = margins
    const contentRight = frame.width - right
    const emptyRight = emptyRegions.some(([, rb]) => rb.x >= contentRight - TOL)
    const sideOk = role === 'cover' || role === 'section' || role === 'closing'
    if (bottom >= UNBALANCED_MARGIN * frame.height && bottom >= 2 * top) {
      const lowest = painting.reduce((m, b) => ((b.painted as Box).y + (b.painted as Box).height > (m.painted as Box).y + (m.painted as Box).height ? b : m))
      out.push({
        code: 'layout/unbalanced',
        severity: 'info',
        blockIds: [lowest.id],
        message: `content ends at y ${r(frame.height - bottom)}: the bottom ${r(bottom)} units (${pct(bottom / frame.height)}% of the frame) are empty, ${r(top)} at the top; ${pct(freeSpace)}% of the slide is free.`,
        fix: `fill ~${r(bottom - top)} more units of height (larger size tokens, taller/more blocks), or centre the content vertically (move it down ~${r((bottom - top) / 2)})`,
      })
    } else if (!sideOk && !emptyRight && right >= UNBALANCED_MARGIN * frame.width && right >= 2 * left) {
      const rightmost = painting.reduce((m, b) => ((b.painted as Box).x + (b.painted as Box).width > (m.painted as Box).x + (m.painted as Box).width ? b : m))
      out.push({
        code: 'layout/unbalanced',
        severity: 'info',
        blockIds: [rightmost.id],
        message: `content ends at x ${r(contentRight)}: the right ${r(right)} units (${pct(right / frame.width)}% of the frame) are empty; ${pct(freeSpace)}% of the slide is free.`,
        fix: `widen the content by ~${r(right - left)} units (a wider block or a two-column layout), or centre it (move it right ~${r((right - left) / 2)})`,
      })
    }
  }

  // AC6: the `full-bleed` layout exists to paint edge to edge (a photo slide): no free space is
  // its design, not a crowded slide.
  if (freeSpace < CROWDED_FREE && !fullBleed) {
    out.push({
      code: 'layout/crowded',
      severity: 'warning',
      blockIds: painting.map((b) => b.id),
      message: `only ${pct(freeSpace)}% of the slide is free (margins t${margins.top} r${margins.right} b${margins.bottom} l${margins.left}).`,
      fix: `drop a block or shorten text until ≥ ${pct(CROWDED_FREE)}% is free, or split the slide in two`,
    })
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* ASCII map                                                                        */
/* ─────────────────────────────────────────────────────────────────────────────── */

function containsPt(b: Box, x: number, y: number): boolean {
  return x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height
}

function freeRatio(frame: Size, painted: Box[]): number {
  const cols = Math.ceil(frame.width / MAP_CELL)
  const rows = Math.ceil(frame.height / MAP_CELL)
  let empty = 0
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * MAP_CELL + MAP_CELL / 2
      const cy = row * MAP_CELL + MAP_CELL / 2
      if (!painted.some((p) => containsPt(p, cx, cy))) empty++
    }
  }
  return Math.round((empty / (cols * rows)) * 100) / 100
}

/**
 * The occupancy map: one char per 40×40 cell, sampled at the cell centre. Upper-case letter =
 * that block paints here; lower-case = inside its box but nothing painted (allocated, empty);
 * `#` = two or more blocks (painted content or boxes); `!` = content painted outside its own
 * box; `.` = empty. Blocks past the 26th share `*`. Layers (LO2): backdrops are drawn only where
 * no other block is, overlays only where they paint — so intended layering is not a `#`.
 */
export function layoutMap(report: LayoutReport): string[] {
  const cols = Math.ceil(report.frame.width / MAP_CELL)
  const rows = Math.ceil(report.frame.height / MAP_CELL)
  const out: string[] = []
  for (let row = 0; row < rows; row++) {
    let line = ''
    for (let col = 0; col < cols; col++) {
      const cx = col * MAP_CELL + MAP_CELL / 2
      const cy = row * MAP_CELL + MAP_CELL / 2
      let paints = 0
      let boxes = 0
      let painter: BlockReport | undefined
      let owner: BlockReport | undefined
      // LO2: a backdrop shows only where nothing else is; an overlay counts only where it paints
      // (a region overlay's box is the whole region). Intended layering is then not a `#`.
      const front = report.blocks.filter((b) => b.layer !== 'backdrop')
      const hit = (b: BlockReport) =>
        (b.layer !== 'overlay' && containsPt(b.box, cx, cy)) || (!!b.painted && containsPt(b.painted, cx, cy))
      const layer = front.some(hit) ? front : report.blocks.filter((b) => b.layer === 'backdrop')
      for (const b of layer) {
        const inBox = b.layer !== 'overlay' && containsPt(b.box, cx, cy)
        if (inBox) {
          boxes++
          owner = b
        }
        if (b.painted && containsPt(b.painted, cx, cy)) {
          paints++
          painter = b
        }
      }
      let ch = '.'
      if (paints >= 2 || boxes >= 2) ch = '#'
      else if (painter) ch = containsPt(painter.box, cx, cy) ? painter.letter : '!'
      else if (owner) ch = owner.letter === '*' ? '*' : owner.letter.toLowerCase()
      line += ch
    }
    out.push(line)
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* formatLayoutReport                                                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

function textSummary(b: BlockReport): string {
  if (b.text.length === 0) return ''
  const one = (t: TextLeafReport) =>
    `${textName(t)} ${t.lines}L×${r(t.lineHeight)}${t.scale < 0.999 ? ` @${Math.round(t.scale * 100)}%` : ''} ~${t.charsPerLine}c/L`
  if (b.text.length <= 3) return ' | ' + b.text.map(one).join(', ')
  const longest = b.text.reduce((m, t) => (t.chars > m.chars ? t : m))
  const totalLines = b.text.reduce((n, t) => n + t.lines, 0)
  return ` | ${b.text.length} text leaves ${totalLines}L, longest ${one(longest)}`
}

function capacitySummary(b: BlockReport): string {
  if (!b.capacity) return ''
  const slots = Object.entries(b.capacity.budget)
  if (slots.length === 0) return ` | cap ${b.capacity.fits ? 'ok' : 'OVER'}`
  return ' | cap ' + slots.map(([s, v]) => `${s} ${v.used}/${v.max}${v.used > v.max ? '!' : ''}`).join(' ')
}

function blockLine(b: BlockReport): string {
  const nat = b.elastic ? 'fill' : `nat ${r(b.natural.width)}x${r(b.natural.height)}`
  const { dx, dy } = b.contentOverflow
  const over =
    dx > OVERFLOW_TOL || dy > OVERFLOW_TOL ? ` OVER ${dx > OVERFLOW_TOL ? `+${Math.ceil(dx)}w ` : ''}${dy > OVERFLOW_TOL ? `+${Math.ceil(dy)}h` : ''}`.trimEnd() : ''
  const layer = b.layer === 'content' ? '' : ` [${b.layer}]`
  const conf = b.confidence === 'high' ? '' : ` | conf ${b.confidence}`
  return `${b.letter} ${b.id} ${b.type} @${b.region}${layer} ${fmtBox(b.box)} ${nat}${over}${textSummary(b)}${capacitySummary(b)}${conf}`
}

/**
 * The report as compact, deterministic text for an LLM prompt: a header, the regions, one line
 * per block, the findings (errors first, each with its fix), margins/free space, and the map.
 */
export function formatLayoutReport(report: LayoutReport, opts: { map?: boolean } = {}): string {
  const count = (s: LayoutFinding['severity']) => report.findings.filter((f) => f.severity === s).length
  const lines: string[] = []
  lines.push(
    `SLIDE ${report.slideId} layout=${report.layout} frame=${report.frame.width}x${report.frame.height} metrics=${report.metrics}` +
      ` | ${report.blocks.length} blocks | ${count('error')} errors, ${count('warning')} warnings`
  )
  const used = new Set(report.blocks.map((b) => b.region))
  const regionText = Object.entries(report.regions)
    .map(([n, b]) => `${n}${used.has(n) ? '' : '(empty)'} ${fmtBox(b)}`)
    .join(' | ')
  if (regionText) lines.push(`regions: ${regionText}`)
  lines.push('blocks (box x,y wxh; nat = painted content size at box width; fill = sizes to its box):')
  for (const b of report.blocks) {
    lines.push(blockLine(b))
    // CMP2: a container's authored children, one short line each (id path, type, box)
    const kids = b.children ?? []
    for (const c of kids.slice(0, MAX_CHILD_LINES)) lines.push(`  ${'  '.repeat(Math.max(0, c.level - 2))}${c.path} ${c.type} ${fmtBox(c.box)}`)
    if (kids.length > MAX_CHILD_LINES) lines.push(`  … ${kids.length - MAX_CHILD_LINES} more nested blocks`)
  }
  if (report.findings.length === 0) {
    lines.push('findings: none')
  } else {
    lines.push('findings:')
    for (const f of report.findings) {
      const sev = f.severity === 'error' ? 'E' : f.severity === 'warning' ? 'W' : 'I'
      lines.push(`${sev} ${f.code} ${f.message}${f.fix ? ` FIX: ${f.fix}` : ''}`)
    }
  }
  const m = report.margins
  lines.push(`margins t${m.top} r${m.right} b${m.bottom} l${m.left} | free ${Math.round(report.freeSpace * 100)}%`)
  lines.push(
    report.needsVisualCheck.length > 0
      ? `screenshot: ${report.needsVisualCheck.map((c) => `${c.blockId} (${c.reason})`).join('; ')}`
      : 'screenshot: not needed'
  )
  if (opts.map !== false) {
    const map = layoutMap(report)
    lines.push(`map ${map[0]?.length ?? 0}x${map.length}, 1 char = ${MAP_CELL} units; A = block paints, a = its box but empty, # = overlap, ! = spill out of box, . = free`)
    lines.push(...map)
  }
  return lines.join('\n')
}
