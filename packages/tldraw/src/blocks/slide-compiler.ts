/**
 * D3 — `compileSlide`: pure function from a `SlideSpec` to an array of `ComponentShape`s.
 *
 * Looks up the slide layout, compiles it to named regions, then iterates each
 * region's `BlockSpec[]` array, stacking blocks vertically within the region box,
 * separated by `tokens.space.md`. Free-positioned blocks (`spec.free[]`) are
 * placed directly. Every shape gets a unique, monotonically-increasing `childIndex`
 * (the P18 bug prevention) across regions AND free[].
 *
 * When a `BlockRegistry` is provided, each block's intrinsic content height is
 * measured via `def.layout()` before assigning boxes: blocks get their measured
 * height (or the equal-split fallback when layout throws), gaps go between them,
 * and leftover height is distributed per the region's vertical alignment.
 *
 * V2.1 — Two-pass region resolution:
 * - Pass 1: Layout produces region boxes with x, width, and y-start as hints.
 *   Height and y are provisional for regions in a vertical run.
 * - Measure: Block intrinsic heights computed per region yield natural heights.
 * - Pass 2: Re-flow y-positions within vertical runs when blocks are measured
 *   (registry provided). Fallback equal-split keeps original behavior unchanged.
 *
 * LO1.5 (layout-oracle README) — two flow fixes found by `analyzeSlide`:
 * - The re-flow is column-aware: a region is pushed down only by an overflowing (or pushed)
 *   region above it that horizontally overlaps it (`reflowRegions`).
 * - In a region with 2+ blocks, a block whose root claims the whole region is re-measured:
 *   fill blocks (charts, images) share the height left after their siblings' natural heights,
 *   content blocks shrink to what they paint (`measureRegionBlocks`).
 *
 * Pure and DOM-free: no `document`, no `window`, no `Date.now()`, no side effects.
 */

import type { ComponentShape } from '~types'
import type {
  BlockAnchor,
  BlockDefinition,
  BlockSpec,
  DeckStyle,
  Box,
  LayoutContext,
  LayoutNode,
  MotionStyle,
  Paint,
  ResolvedTokens,
  SlideSpec,
  Size,
  SurfaceContext,
} from './types'
import { BLOCK_PROP_KEY, blockToShape } from './shape-bridge'
import { getSlideLayout, SLIDE_LAYOUTS } from './slide-layouts'
import { nearestName } from './nearest-name'
import type { BlockRegistry } from './registry'
import { createLayoutContext } from './layout'
import { layoutBlock } from './layout/layout-child'
import { collectPaintedLeaves, measureBlock, paintedBounds, unionBox } from './layout/measure-block'
import { effectiveMotionStyle, readingOrder, styleBlockMotion } from './motion/motion-style'
import { deriveShapeAnimation } from './motion/resolve-motion'
import { blockAnchor } from './block-layer'
import { applyStyleBlockDefaults } from './styles'
import { MAX_NESTING_DEPTH } from './types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Finding type                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface CompileFinding {
  level: 'error' | 'warning'
  rule: 'region/unknown' | 'region/overflow' | 'block/unregistered'
  slideId: string
  region?: string
  blockId?: string
  message: string
  suggestion?: string
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Return type                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface CompileSlideResult {
  /** ComponentShapes produced by mapping `spec.regions` through the layout regions. */
  shapes: ComponentShape[]
  /** Propagated from `spec.background`. */
  background?: Paint
  /** Propagated from `spec.masterId`. */
  masterId?: string
  /** Propagated from `spec.notes`. */
  notes?: string
  /** Propagated from `spec.skip`. */
  skipInPresentation?: boolean
  /** The resolved layout id (may differ from spec.layout when fallback is used). */
  layout: string
  /** The slide spec id. */
  slideSpecId: string
  /** Compile-time diagnostics. */
  findings: CompileFinding[]
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* compileSlide                                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** The layout used when `spec.layout` is absent or unknown. */
const FALLBACK_LAYOUT = 'blank' as const

/**
 * Compile a `SlideSpec` into shapes, background, and metadata.
 *
 * 1. Resolve the layout (fall back to `'blank'` for absent or unknown layout names).
 * 2. Call `layout.compile(frame, tokens)` to get named `Box` regions.
 * 3. For each `spec.regions[regionName]`, iterate the `BlockSpec[]` array and stack
 *    blocks vertically within the region box, separated by `tokens.space.md`.
 *    When a `BlockRegistry` is provided, each block's intrinsic height is measured
 *    via `def.layout()` and assigned accordingly; the equal split is the fallback
 *    for a block whose layout throws.
 * 4. For each `spec.free[]` entry, call `blockToShape(entry.block, entry.box)` directly.
 * 5. All shapes share a single monotonically-increasing `childIndex` counter.
 * 6. Return `layout`, `slideSpecId`, and `findings: CompileFinding[]`.
 *
 * @param spec     The slide specification (regions, free, layout, metadata).
 * @param frame    The slide frame dimensions `{ width, height }` in slide units.
 * @param tokens   Resolved design tokens for the deck.
 * @param registry Optional block registry for intrinsic-height measurement.
 *                 When provided, blocks are measured via `def.layout()` instead
 *                 of receiving an equal split of the region height.
 * @returns Compiled shapes and pass-through metadata.
 */
export function compileSlide(
  spec: SlideSpec,
  frame: { width: number; height: number },
  tokens: ResolvedTokens,
  registry?: BlockRegistry,
  opts?: CompileSlideOptions
): CompileSlideResult {
  if (!opts?.blockDefaults) return compileSlideUnstyled(spec, frame, tokens, registry, opts)
  // AC1: fill the style's knob defaults under each top-level block's authored props (measure and
  // render see them), then record what was filled as `$block.styleDefaults` so `shapeToBlock`
  // returns the authored props only.
  const filledById = new Map<string, Record<string, unknown>>()
  const style = (b: BlockSpec): BlockSpec => {
    const { block, filled } = applyStyleBlockDefaults(b, opts.blockDefaults)
    if (filled && typeof b.id === 'string') filledById.set(b.id, filled)
    return block
  }
  const styled: SlideSpec = {
    ...spec,
    regions: Object.fromEntries(Object.entries(spec.regions ?? {}).map(([r, blocks]) => [r, (blocks ?? []).map(style)])),
    ...(spec.free ? { free: spec.free.map((e) => ({ ...e, block: style(e.block) })) } : {}),
  }
  const result = compileSlideUnstyled(styled, frame, tokens, registry, opts)
  if (filledById.size) {
    for (const shape of result.shapes) {
      const meta = shape.props[BLOCK_PROP_KEY] as Record<string, unknown> | undefined
      const filled = meta && typeof meta.id === 'string' ? filledById.get(meta.id) : undefined
      if (meta && filled) meta.styleDefaults = JSON.parse(JSON.stringify(filled))
    }
  }
  return result
}

function compileSlideUnstyled(
  spec: SlideSpec,
  frame: { width: number; height: number },
  tokens: ResolvedTokens,
  registry?: BlockRegistry,
  opts?: CompileSlideOptions
): CompileSlideResult {
  // LO2: blocks with an explicit `layer: 'backdrop' | 'overlay'` in a region are out of flow.
  const layered = splitLayeredBlocks(spec)
  if (layered) return compileLayered(layered, frame, tokens, registry, opts)

  const findings: CompileFinding[] = []
  // P7: blocks with no own `motion` that a slide/deck motion style may animate.
  const styleCandidates: StyleCandidate[] = []
  const slideId = spec.id

  // 1. Resolve layout regions.
  const { regionBoxes, layout: resolvedLayout, isFallback } = resolveRegions(spec.layout, frame, tokens)

  if (isFallback) {
    findings.push({
      level: 'warning',
      rule: 'region/unknown',
      slideId,
      message: `Unknown layout "${spec.layout}"; falling back to "${FALLBACK_LAYOUT}".`,
    })
  }

  // 2. Get vertical alignment map from the resolved layout.
  const regionAlignMap = resolvedLayout?.regionAlign

  // V2.1: Two-pass region resolution.
  // Pass 1 — measure every region's blocks once (LO1.5: fill-aware, see `measureRegionBlocks`);
  // the same heights feed both the re-flow below and the placement loop.
  const regionNaturalHeights = new Map<string, number>()
  const regionBlockHeights = new Map<string, number[]>()
  const knownRegionNames = Object.keys(regionBoxes)
  const gap = tokens.space.md

  // F3.1: one fresh memo cache per compile pass.
  const intrinsicSizeCache = new Map<string, Size>()
  if (registry) {
    for (const regionName of knownRegionNames) {
      const regionBox = regionBoxes[regionName]
      const blocks = spec.regions[regionName] ?? []
      if (blocks.length === 0 || !regionBox) continue

      const blockHeights = measureRegionBlocks(blocks, regionBox, gap, tokens, registry, intrinsicSizeCache, opts?.blockDefaults)
      regionBlockHeights.set(regionName, blockHeights)

      // Natural height = measured blocks + gaps.
      const gapsTotal = blocks.length > 1 ? (blocks.length - 1) * gap : 0
      // LO0: skip a block that failed to measure (-1); never reset the running sum.
      const measuredTotal = blockHeights.reduce((sum, h) => (h > 0 ? sum + h : sum), 0)
      regionNaturalHeights.set(regionName, measuredTotal + gapsTotal)
    }
  }

  // Pass 2 — re-flow. LO1.5: column-aware. A region is pushed down only by the regions *above*
  // it that horizontally overlap it and actually grew or moved; side-by-side columns flow
  // independently (an overfull `left` no longer pushes `right` below it).
  const regionYPositions = registry
    ? reflowRegions(knownRegionNames, regionBoxes, regionNaturalHeights, (name) => (spec.regions[name] ?? []).length > 0, gap)
    : new Map<string, number>()

  // 3. Convert each region's blocks to ComponentShapes, stacking vertically.
  const shapes: ComponentShape[] = []
  let childIndex = 1

  for (const [regionName, blocks] of Object.entries(spec.regions)) {
    const regionBox: Box | undefined = regionBoxes[regionName]

    if (!regionBox) {
      // Unknown region — emit finding with suggestion (nearest region name).
      const suggestion = nearestRegion(regionName, knownRegionNames)
      findings.push({
        level: 'warning',
        rule: 'region/unknown',
        slideId,
        region: regionName,
        message: `Region "${regionName}" does not exist in the "${spec.layout}" layout.`,
        suggestion: suggestion ? `Did you mean "${suggestion}"?` : undefined,
      })
      continue
    }

    const regionAlign = regionAlignMap?.[regionName] ?? 'start'

    if (blocks.length === 0) {
      // Empty region — no shapes.
      continue
    }

    // V2.1: Get the y-position for this region.
    // With registry: use re-flowed position based on natural heights.
    // Without registry: use layout position with alignment offset.
    const flowedY = regionYPositions.get(regionName) ?? regionBox.y

    // Stack blocks vertically within the region box.
    // When a registry is provided, measure each block's intrinsic height first.
    let blockHeights: number[]

    if (registry && blocks.length > 0) {
      blockHeights = regionBlockHeights.get(regionName) ?? blocks.map(() => -1)
    } else {
      blockHeights = blocks.map(() => -1) // all fallback
    }

    // Compute fallback equal-split height for any block that didn't measure.
    const totalBlocks = blocks.length
    const fallbackCount = blockHeights.filter((h) => h < 0).length
    const measuredTotal = blockHeights.reduce((sum, h) => (h > 0 ? sum + h : sum), 0)
    const gapsTotal = totalBlocks > 1 ? (totalBlocks - 1) * gap : 0
    const remainingForFallback = Math.max(0, regionBox.height - measuredTotal - gapsTotal)
    const fallbackHeight = fallbackCount > 0 ? remainingForFallback / fallbackCount : 0

    // Replace fallback markers with the computed fallback height.
    const finalHeights = blockHeights.map((h) => (h >= 0 ? h : fallbackHeight))

    // V2.1: Use natural height when registry provided for effective region height.
    const hasRegistry = registry !== undefined
    // LO2.1: align within the layout box (or the natural height when that is taller). Aligning
    // within the natural height alone left no leftover, so `center`/`end` never took effect.
    const regionEffectiveHeight = hasRegistry
      ? Math.max(regionBox.height, regionNaturalHeights.get(regionName) ?? regionBox.height)
      : regionBox.height
    const totalAssigned = finalHeights.reduce((sum, h) => sum + h, 0) + gapsTotal
    const leftoverInRegion = regionEffectiveHeight - totalAssigned

    // Determine y-start for this region
    // V2.1: When registry provided, use re-flowed position. Otherwise, use layout position with alignment.
    let startY: number
    let offset = 0
    if (regionAlign === 'center') {
      offset = Math.max(0, leftoverInRegion / 2)
    } else if (regionAlign === 'end') {
      offset = Math.max(0, leftoverInRegion)
    }
    if (hasRegistry) {
      // Use the re-flowed y-position from Pass 2 — apply alignment offset too (F3.2)
      startY = flowedY + offset
    } else {
      // Use original position with alignment offset
      startY = regionBox.y + offset
    }

    let currentY = startY

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const blockHeight = finalHeights[i]

      const box: Box = {
        x: regionBox.x,
        y: currentY,
        width: regionBox.width,
        height: blockHeight,
      }

      // Check for overflow: block taller than remaining region space.
      if (blockHeight > regionBox.height + gap) {
        findings.push({
          level: 'warning',
          rule: 'region/overflow',
          slideId,
          region: regionName,
          blockId: block.id,
          message: `Block "${block.id}" measures ${Math.round(blockHeight)} slide units tall, exceeding the "${regionName}" region height of ${Math.round(regionBox.height)} slide units.`,
        })
      }

      // Look up the block definition for motion resolution.
      const blockDef = registry?.get(block.type)
      const shape = blockToShape(block, box, {
        childIndex: childIndex++,
        definitionMotion: blockDef?.motion,
      })
      shapes.push(shape)
      if (blockDef && block.motion === undefined) styleCandidates.push({ shape, block, def: blockDef, box })
      currentY += blockHeight + gap
    }
  }

  // 4. Handle spec.free[] — place them directly using their explicit box.
  const freeShapes = new Set<ComponentShape>()
  if (spec.free) {
    for (const entry of spec.free) {
      const blockDef = registry?.get(entry.block.type)
      const shape = blockToShape(entry.block, entry.box, {
        childIndex: childIndex++,
        definitionMotion: blockDef?.motion,
      })
      shapes.push(shape)
      freeShapes.add(shape)
      // LO8: a layered free block stays free on the round trip (`slide-decompiler.ts`).
      if (entry.block?.layer === 'backdrop' || entry.block?.layer === 'overlay') {
        const meta = shape.props[BLOCK_PROP_KEY] as Record<string, unknown>
        meta.placed = { box: { ...entry.box }, from: 'free' }
      }
      if (blockDef && entry.block.motion === undefined) {
        styleCandidates.push({ shape, block: entry.block, def: blockDef, box: entry.box })
      }
    }
  }

  // 5. P7 — motion style. Only when a style is set; absent = the output above, untouched.
  const motionStyle = effectiveMotionStyle(spec.motionStyle, opts?.motionStyle)
  if (motionStyle) applyMotionStyle(motionStyle, styleCandidates)

  // LO8: a free block with `layer: 'backdrop'` (e.g. a layered block the user dragged, which the
  // decompiler keeps in `free[]`) paints under every other shape, as it did in the region.
  if (spec.free?.some((e) => e.block?.layer === 'backdrop')) {
    const isFreeBackdrop = (sh: ComponentShape): boolean =>
      (sh.props[BLOCK_PROP_KEY] as { layer?: string } | undefined)?.layer === 'backdrop' &&
      freeShapes.has(sh)
    const reordered = [...shapes.filter(isFreeBackdrop), ...shapes.filter((sh) => !isFreeBackdrop(sh))]
    reordered.forEach((sh, i) => {
      sh.childIndex = i + 1
    })
    shapes.splice(0, shapes.length, ...reordered)
  }

  return {
    shapes,
    background: spec.background,
    masterId: spec.masterId,
    notes: spec.notes,
    skipInPresentation: spec.skip,
    layout: spec.layout,
    slideSpecId: spec.id,
    findings,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Internal helpers                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Options for `compileSlide`. */
export interface CompileSlideOptions {
  /** The deck's `motionStyle`; the slide's own `motionStyle` wins over it. */
  motionStyle?: MotionStyle
  /** AC1 — the deck style's `blockDefaults`, filled under authored props (`$block.styleDefaults`). */
  blockDefaults?: DeckStyle['blockDefaults']
}

interface StyleCandidate {
  shape: ComponentShape
  block: BlockSpec
  def: BlockDefinition
  box: Box
}

/**
 * P7 — give every block with no own `motion` the motion its slide's style implies, in reading
 * order. The derived spec goes to `$block.styleMotion` (plus `$block.motionStyle` for the html
 * runtime), never to `$block.motion`, so `documentToDeckSpec` returns what was authored.
 */
function applyMotionStyle(style: MotionStyle, candidates: StyleCandidate[]): void {
  const ordered = [...candidates].sort((a, b) => readingOrder(a.box, b.box))
  let index = 0
  for (const c of ordered) {
    const motion = styleBlockMotion(style, c.def.motion, index)
    if (!motion) continue
    const animation = deriveShapeAnimation(motion, c.def.motion)
    if (!animation) continue
    index++
    c.shape.animation = animation
    const meta = c.shape.props[BLOCK_PROP_KEY] as Record<string, unknown>
    meta.styleMotion = motion
    meta.motionStyle = style
  }
}

/** Rounding slack (slide units) for "claims the whole region" and overlap tests. */
const FLOW_TOL = 1
/** Verification passes when shrinking a content-sized block to its painted height. */
const CONTENT_FIT_PASSES = 3

/** LO1.5 — how a block's height is decided inside a multi-block region. */
interface RegionSizing {
  /** `rigid`: content-sized root, kept as measured. `content`: root claims the whole region but
   *  its painted content is smaller. `fill`: content follows the box (chart, image, donut). */
  kind: 'rigid' | 'content' | 'fill'
  /** Height before distribution (rigid: root; content: painted height; fill: its min). */
  height: number
  /** Never taller than the root it returned at the full region height. */
  cap: number
}

/**
 * Measure every block of one region. Returns one height per block, `-1` for a block that could
 * not be measured (unregistered / layout threw → equal-split fallback in the placement loop).
 *
 * A single block keeps the height its layout returns at the region box (as before LO1.5). With
 * two or more blocks, a block whose root claims the whole region (`>= region height`) would push
 * every sibling off the region, so it is re-measured with `measureBlock`:
 * - `elastic` (fills its box: charts, images, a donut) → a `fill` block;
 * - otherwise (the root is `max(region, content)` or the block centres its content) → a
 *   `content` block at its painted height, verified by laying it out at that height.
 * Then the region height left after rigid/content blocks and gaps is shared among the fill
 * blocks (each at least `def.size.min[1]`); with no fill block, the leftover is shared among the
 * `content` blocks instead, so a block that was designed to take the region still does, minus
 * its siblings. Pure: same input, same heights.
 */
function measureRegionBlocks(
  blocks: BlockSpec[],
  regionBox: Box,
  gap: number,
  tokens: ResolvedTokens,
  registry: BlockRegistry,
  intrinsicSizeCache: Map<string, Size>,
  blockDefaults?: Record<string, Record<string, unknown>>
): number[] {
  const regionSize = { width: regionBox.width, height: regionBox.height }
  // CMP1: the style's knob defaults reach nested children too (`layoutChild` fills them).
  const bd = blockDefaults ? { blockDefaults } : {}
  const sharedCtx = createLayoutContext({
    box: regionSize,
    tokens,
    surface: MINIMAL_SURFACE,
    registry,
    intrinsicSizeCache, // F3.1: scoped memo cache
    ...bd,
  })
  // B3-H1: a per-block ctx when instance style overrides (padding/align) are present. `style` is
  // a top-level BlockSpec field in deck JSON (not `props.$block.style` — that reserved key only
  // exists on rendered editor shapes, see block-authoring README pitfall #3/#5).
  const ctxFor = (block: BlockSpec): LayoutContext => {
    const blockStyle = block.style
    const usePerBlock =
      blockStyle !== undefined && (blockStyle.padding !== undefined || blockStyle.align !== undefined)
    return usePerBlock
      ? createLayoutContext({
          box: regionSize,
          tokens,
          surface: MINIMAL_SURFACE,
          registry,
          intrinsicSizeCache,
          style: blockStyle,
          ...bd,
        })
      : sharedCtx
  }

  const roots = blocks.map((block) => {
    const def = registry.get(block.type)
    if (!def) return -1
    try {
      return layoutBlock(def, block.props as Record<string, unknown>, ctxFor(block)).box.height
    } catch {
      return -1
    }
  })
  if (blocks.length < 2) return roots

  const sizing: Array<RegionSizing | null> = blocks.map((block, i) => {
    const root = roots[i]
    if (root < 0) return null
    if (root < regionBox.height - FLOW_TOL) return { kind: 'rigid', height: root, cap: root }
    const def = registry.get(block.type)!
    const props = block.props as Record<string, unknown>
    const ctx = ctxFor(block)
    const minH = Math.min(def.size.min?.[1] ?? 0, root)
    const m = measureBlock(def, props, regionBox.width, ctx, { height: regionBox.height })
    if (m.reason?.startsWith('layout threw')) return { kind: 'rigid', height: root, cap: root }
    if (m.elastic) return { kind: 'fill', height: minH, cap: root }
    const fitted = fitContentHeight(def, props, ctx, regionBox.width, m.natural.height, root)
    return { kind: 'content', height: Math.min(root, Math.max(fitted, minH)), cap: root }
  })

  const fixedTotal = sizing.reduce((sum, s) => sum + (s && s.kind !== 'fill' ? s.height : 0), 0)
  const gapsTotal = (blocks.length - 1) * gap
  const flexKind: RegionSizing['kind'] = sizing.some((s) => s?.kind === 'fill') ? 'fill' : 'content'
  const flex = sizing.filter((s): s is RegionSizing => s !== null && s.kind === flexKind)
  // Failed blocks (-1) take an equal split of what is left in the placement loop; leave them out.
  const flexBase = flexKind === 'content' ? flex.reduce((sum, s) => sum + s.height, 0) : 0
  const room = regionBox.height - gapsTotal - (fixedTotal - flexBase)
  if (flex.length > 0) {
    if (flexKind === 'fill') {
      const share = room / flex.length
      for (const s of flex) s.height = Math.min(s.cap, Math.max(s.height, share))
    } else {
      const extra = Math.max(0, room - flexBase) / flex.length
      for (const s of flex) s.height = Math.min(s.cap, s.height + extra)
    }
  }
  return sizing.map((s, i) => (s ? s.height : roots[i]))
}

/**
 * Height at which a content-sized block paints entirely inside its box: start from its painted
 * height (`measureBlock`'s tall probe) and grow by whatever spills out (a top inset, a card's
 * padding) until it fits, at most `cap` (its height at the full region).
 */
function fitContentHeight(
  def: BlockDefinition,
  props: Record<string, unknown>,
  ctx: LayoutContext,
  width: number,
  natural: number,
  cap: number
): number {
  let h = Math.min(cap, Math.max(1, Math.ceil(natural)))
  for (let i = 0; i < CONTENT_FIT_PASSES && h < cap; i++) {
    const size = { width, height: h }
    let bounds: Box | null
    try {
      const node = layoutBlock(def, props, ctx.withBox ? ctx.withBox(size) : ctx)
      bounds = paintedBounds(collectPaintedLeaves(node, size))
    } catch {
      return cap
    }
    if (!bounds) return h
    const spill = Math.max(0, bounds.y + bounds.height - h) + Math.max(0, -bounds.y)
    if (spill <= FLOW_TOL) return h
    h = Math.min(cap, Math.ceil(h + spill))
  }
  return h
}

/**
 * LO1.5 — column-aware region re-flow. Regions are visited top to bottom; a region moves down
 * only when a region *above it that horizontally overlaps it* ends lower than its layout box did
 * (it overflowed, or was itself pushed). It then starts below that region's flowed bottom plus
 * `min(gap, layout spacing)`; regions that originally overlapped vertically keep their offset.
 * A region's flowed height is `max(natural, layout height)`. Returns region → flowed y; regions
 * that do not move are left out (callers fall back to the layout y).
 */
function reflowRegions(
  names: string[],
  regionBoxes: Record<string, Box>,
  naturalHeights: Map<string, number>,
  hasContent: (name: string) => boolean,
  gap: number
): Map<string, number> {
  const out = new Map<string, number>()
  const order = names
    .filter((n) => regionBoxes[n] && hasContent(n))
    .sort((a, b) => regionBoxes[a].y - regionBoxes[b].y || regionBoxes[a].x - regionBoxes[b].x)
  const flowed: Array<{ box: Box; y: number; height: number }> = []
  for (const name of order) {
    const box = regionBoxes[name]
    let y = box.y
    for (const p of flowed) {
      if (p.box.y >= box.y) continue // not above
      const overlapsX = p.box.x < box.x + box.width - FLOW_TOL && box.x < p.box.x + p.box.width - FLOW_TOL
      if (!overlapsX) continue
      const origBottom = p.box.y + p.box.height
      const bottom = p.y + p.height
      const grew = bottom - origBottom
      if (grew <= FLOW_TOL) continue
      const spacing = box.y - origBottom
      y = spacing < 0 ? Math.max(y, box.y + grew) : Math.max(y, bottom + Math.min(gap, spacing))
    }
    const height = Math.max(naturalHeights.get(name) ?? box.height, box.height)
    flowed.push({ box, y, height })
    if (y !== box.y) out.set(name, y)
  }
  return out
}

/** Minimal surface context for measurement — neutral white, no image. */
const MINIMAL_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#ffffff' },
  luminance: 1,
  overImage: false,
}

/**
 * Look up the layout by name and compile it. Falls back to `FALLBACK_LAYOUT`
 * when `layoutId` is absent or does not match any registered layout.
 */
function resolveRegions(
  layoutId: string | undefined,
  frame: { width: number; height: number },
  tokens: ResolvedTokens
): { regionBoxes: Record<string, Box>; layout: typeof SLIDE_LAYOUTS[number] | undefined; isFallback: boolean } {
  if (layoutId) {
    const layout = getSlideLayout(layoutId as Parameters<typeof getSlideLayout>[0])
    if (layout) {
      return { regionBoxes: layout.compile(frame, tokens), layout, isFallback: false }
    }
  }

  // Fallback: use the blank layout (one `content` region filling the safe margin).
  const fallback = SLIDE_LAYOUTS.find((l) => l.id === FALLBACK_LAYOUT)
  return {
    regionBoxes: fallback ? fallback.compile(frame, tokens) : {},
    layout: fallback,
    isFallback: true,
  }
}

/**
 * Find the nearest known region name, so an unknown-region finding can name the replacement.
 * Delegates to the shared Levenshtein scorer — see `nearest-name.ts` for why this used to be a
 * prefix scorer and why that was wrong.
 */
function nearestRegion(target: string, knownRegions: string[]): string | undefined {
  return nearestName(target, knownRegions)
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* LO2 — layered region blocks (backdrop / overlay)                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** One region block taken out of the vertical stack by an explicit `layer`. */
export interface LayeredRegionBlock {
  region: string
  /** Index in the authored `spec.regions[region]` array. */
  index: number
  block: BlockSpec
  layer: 'backdrop' | 'overlay'
}

export interface LayeredSplit {
  /** The slide with every layered block removed from its region (region keys kept). */
  flow: SlideSpec
  backdrops: LayeredRegionBlock[]
  overlays: LayeredRegionBlock[]
}

/**
 * Split a slide's region blocks into the stacked flow and the out-of-flow layered blocks
 * (`BlockSpec.layer` explicitly `'backdrop'` or `'overlay'`). `undefined` when there are none, so
 * a slide without layers compiles through exactly the code path it always did.
 */
export function splitLayeredBlocks(spec: SlideSpec): LayeredSplit | undefined {
  const backdrops: LayeredRegionBlock[] = []
  const overlays: LayeredRegionBlock[] = []
  const regions: Record<string, BlockSpec[]> = {}
  for (const [region, blocks] of Object.entries(spec.regions)) {
    if (!Array.isArray(blocks)) {
      regions[region] = blocks
      continue
    }
    regions[region] = []
    blocks.forEach((block, index) => {
      const layer = block?.layer
      if (layer === 'backdrop') backdrops.push({ region, index, block, layer })
      else if (layer === 'overlay') overlays.push({ region, index, block, layer })
      else regions[region].push(block)
    })
  }
  if (backdrops.length === 0 && overlays.length === 0) return undefined
  return { flow: { ...spec, regions }, backdrops, overlays }
}

/**
 * Compile a slide with layered region blocks, deterministically:
 * 1. the flow (everything else) compiles exactly as `compileSlide` always does;
 * 2. each layered block gets its region's box — the layout box, grown to cover the region's
 *    stacked blocks when they overflow or were re-flowed — or, with `anchorTo`, the painted box
 *    of that stacked block of the same region (LO2.1); `anchor: 'fill'` takes that whole box,
 *    any other anchor the block's natural size at that edge/corner (`anchoredBox`). It does not
 *    take part in stacking;
 * 3. z: every backdrop paints under every other shape, every overlay over every other shape
 *    (authored order within each layer). `childIndex` is renumbered 1..n in that order and the
 *    returned `shapes` array is in that order.
 * Layered blocks keep their own/definition motion; the slide's `motionStyle` does not stagger
 * them (it would renumber the flow's reading order).
 */
function compileLayered(
  split: LayeredSplit,
  frame: { width: number; height: number },
  tokens: ResolvedTokens,
  registry: BlockRegistry | undefined,
  opts: CompileSlideOptions | undefined
): CompileSlideResult {
  const result = compileSlide(split.flow, frame, tokens, registry, opts)
  const { regionBoxes } = resolveRegions(split.flow.layout, frame, tokens)

  const regionExtent = (region: string): Box | undefined => {
    const rb = regionBoxes[region]
    if (!rb) return undefined
    const ids = new Set((split.flow.regions[region] ?? []).map((b) => b.id))
    let x1 = rb.x
    let y1 = rb.y
    let x2 = rb.x + rb.width
    let y2 = rb.y + rb.height
    for (const shape of result.shapes) {
      const id = (shape.props[BLOCK_PROP_KEY] as { id?: string } | undefined)?.id
      if (id === undefined || !ids.has(id)) continue
      x1 = Math.min(x1, shape.point[0])
      y1 = Math.min(y1, shape.point[1])
      x2 = Math.max(x2, shape.point[0] + shape.size[0])
      y2 = Math.max(y2, shape.point[1] + shape.size[1])
    }
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
  }

  const blockDefaults = opts?.blockDefaults
  // LO2.1: the painted box of a stacked block in the same region, for `anchorTo`.
  // CMP1: or of a block nested inside one (a badge on card 2 of a grid) — found by the `blockId`
  // the engine stamps on every child wrapper group.
  const targetBox = (l: LayeredRegionBlock): Box | undefined => {
    const targetId = l.block.anchorTo
    if (typeof targetId !== 'string') return undefined
    const stacked = split.flow.regions[l.region] ?? []
    const target = stacked.find((b) => b.id === targetId) ?? stacked.find((b) => containsBlockId(b, targetId))
    if (!target) return undefined
    const shape = result.shapes.find((sh) => (sh.props[BLOCK_PROP_KEY] as { id?: string } | undefined)?.id === target.id)
    if (!shape) return undefined
    const box: Box = { x: shape.point[0], y: shape.point[1], width: shape.size[0], height: shape.size[1] }
    const nested = target.id === targetId ? undefined : targetId
    const painted = registry ? paintedBoxOf(target, box, tokens, registry, blockDefaults, nested) : null
    return painted ?? (nested ? undefined : box)
  }

  // CMP1: a region whose layered backdrop is an image (`tls.m.image`) puts its stacked and overlay
  // blocks over a photo: their shapes carry `$block.overImage`, so the editor and the layout report
  // solve their text against an image surface (and CMP2's contrast check asks for a scrim).
  const imageRegions = new Set(split.backdrops.filter((l) => l.block.type === IMAGE_TYPE).map((l) => l.region))

  const place = (l: LayeredRegionBlock): ComponentShape[] => {
    const region = regionExtent(l.region)
    // Unknown region: the flow compile already reported `region/unknown` for it.
    if (!region) return []
    const def = registry?.get(l.block.type)
    const target = targetBox(l)
    const box = anchoredBox(l.block, def, target ?? region, target ? tokens.space.sm : 0, tokens, registry, region, blockDefaults)
    const shape = blockToShape(l.block, box, { definitionMotion: def?.motion })
    // LO8: remember where the compiler put it, so a drag in the editor survives the round trip.
    const meta = shape.props[BLOCK_PROP_KEY] as Record<string, unknown>
    meta.placed = { box: { ...box }, from: 'region' }
    if (l.layer === 'overlay' && imageRegions.has(l.region)) meta.overImage = true
    return [shape]
  }

  if (imageRegions.size) {
    for (const shape of result.shapes) {
      const meta = shape.props[BLOCK_PROP_KEY] as Record<string, unknown> | undefined
      const id = typeof meta?.id === 'string' ? meta.id : undefined
      if (!meta || id === undefined) continue
      const inImageRegion = [...imageRegions].some((r) => (split.flow.regions[r] ?? []).some((b) => b.id === id))
      if (inImageRegion) meta.overImage = true
    }
  }

  const shapes = [...split.backdrops.flatMap(place), ...result.shapes, ...split.overlays.flatMap(place)]
  shapes.forEach((shape, i) => {
    shape.childIndex = i + 1
  })
  return { ...result, shapes }
}

/** Visible extent of a placed block — painted leaves *and* full-box backdrops (a card's surface
 *  is its corner), slide coordinates; `null` when it paints nothing or throws. */
function paintedBoxOf(
  block: BlockSpec,
  box: Box,
  tokens: ResolvedTokens,
  registry: BlockRegistry,
  blockDefaults?: Record<string, Record<string, unknown>>,
  nestedId?: string
): Box | null {
  const def = registry.get(block.type)
  if (!def) return null
  const size = { width: box.width, height: box.height }
  try {
    const ctx = createLayoutContext({
      box: size,
      tokens,
      surface: MINIMAL_SURFACE,
      registry,
      ...(block.style ? { style: block.style } : {}),
      ...(blockDefaults ? { blockDefaults } : {}),
    })
    const root = layoutBlock(def, block.props as Record<string, unknown>, ctx)
    let local: Box | null
    if (nestedId) {
      // CMP1: the nested block's wrapper group, in the block's own coordinates.
      const found = findBlockGroup(root, nestedId)
      if (!found) return null
      const inner = { width: found.box.width, height: found.box.height }
      const c = collectPaintedLeaves({ ...found.group, box: { x: 0, y: 0, ...inner } }, inner)
      const painted = unionBox([...c.leaves, ...c.backdrops].map((l) => l.box))
      if (!painted) return null
      const cx1 = Math.max(0, painted.x)
      const cy1 = Math.max(0, painted.y)
      const cx2 = Math.min(inner.width, painted.x + painted.width)
      const cy2 = Math.min(inner.height, painted.y + painted.height)
      if (cx2 <= cx1 || cy2 <= cy1) return null
      local = { x: found.box.x + cx1, y: found.box.y + cy1, width: cx2 - cx1, height: cy2 - cy1 }
    } else {
      const c = collectPaintedLeaves(root, size)
      local = unionBox([...c.leaves, ...c.backdrops].map((l) => l.box))
    }
    if (!local) return null
    // Clip to the block's own box: an anchor never follows content that overflows it.
    const x1 = Math.max(box.x, box.x + local.x)
    const y1 = Math.max(box.y, box.y + local.y)
    const x2 = Math.min(box.x + box.width, box.x + local.x + local.width)
    const y2 = Math.min(box.y + box.height, box.y + local.y + local.height)
    return x2 > x1 && y2 > y1 ? { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } : null
  } catch {
    return null
  }
}

/** Passes `anchoredSize` may grow a box by before it accepts what the block paints. */
const ANCHOR_FIT_PASSES = 6

/**
 * LO2.1 — the box of a layered block inside `container` (its region's extent, or the visible box
 * of its `anchorTo` block). `'fill'` → the container. Any other anchor → the block's natural size
 * (sized within `bounds`, default the container: a badge on a small target keeps its own size)
 * at that edge/corner of the container shrunk by `inset`. Pure and deterministic.
 */
export function anchoredBox(
  block: BlockSpec,
  def: BlockDefinition | undefined,
  container: Box,
  inset: number,
  tokens: ResolvedTokens,
  registry: BlockRegistry | undefined,
  bounds: Box = container,
  blockDefaults?: Record<string, Record<string, unknown>>
): Box {
  const anchor: BlockAnchor = blockAnchor(block, def)
  if (anchor === 'fill' || !def || !registry) return container
  const inner =
    container.width > 2 * inset && container.height > 2 * inset
      ? { x: container.x + inset, y: container.y + inset, width: container.width - 2 * inset, height: container.height - 2 * inset }
      : container
  const { width: w, height: h } = anchoredSize(block, def, bounds, tokens, registry, blockDefaults)
  const [col, row] = ANCHOR_GRID[anchor]
  return {
    x: inner.x + ((inner.width - w) * col) / 2,
    y: inner.y + ((inner.height - h) * row) / 2,
    width: w,
    height: h,
  }
}

/** Anchor → [column, row] in halves: 0 = start, 1 = centre, 2 = end. */
const ANCHOR_GRID: Record<Exclude<BlockAnchor, 'fill'>, [number, number]> = {
  'top-left': [0, 0],
  top: [1, 0],
  'top-right': [2, 0],
  left: [0, 1],
  center: [1, 1],
  right: [2, 1],
  'bottom-left': [0, 2],
  bottom: [1, 2],
  'bottom-right': [2, 2],
}

/**
 * Natural size of a layered block inside `inner`: `measureBlock`'s painted size, then grown until
 * the block paints that size inside the box (a badge shrinks its type in a box only as tall as
 * its pill). Elastic blocks (no natural size) and blocks whose layout throws get
 * `size.preferred`. Always clamped to `inner`.
 */
function anchoredSize(
  block: BlockSpec,
  def: BlockDefinition,
  inner: Box,
  tokens: ResolvedTokens,
  registry: BlockRegistry,
  blockDefaults?: Record<string, Record<string, unknown>>
): Size {
  const props = block.props as Record<string, unknown>
  const ctxAt = (size: Size) =>
    createLayoutContext({
      box: size,
      tokens,
      surface: MINIMAL_SURFACE,
      registry,
      ...(block.style ? { style: block.style } : {}),
      ...(blockDefaults ? { blockDefaults } : {}),
    })
  const clampW = (v: number) => Math.max(1, Math.min(inner.width, Math.ceil(v)))
  const clampH = (v: number) => Math.max(1, Math.min(inner.height, Math.ceil(v)))
  const m = measureBlock(def, props, inner.width, ctxAt({ width: inner.width, height: inner.height }), { height: inner.height })
  if (m.elastic || m.reason?.startsWith('layout threw') || m.natural.height <= 0) {
    return { width: clampW(def.size.preferred[0]), height: clampH(def.size.preferred[1]) }
  }
  const want = m.natural
  let w = clampW(want.width)
  let h = clampH(want.height)
  for (let i = 0; i < ANCHOR_FIT_PASSES; i++) {
    let b: Box | null
    try {
      b = paintedBounds(collectPaintedLeaves(layoutBlock(def, props, ctxAt({ width: w, height: h })), { width: w, height: h }))
    } catch {
      break
    }
    if (!b) break
    const spillH = Math.max(0, b.y + b.height - h) + Math.max(0, -b.y)
    const spillW = Math.max(0, b.x + b.width - w) + Math.max(0, -b.x)
    const shortH = Math.max(0, want.height - b.height)
    const shortW = Math.max(0, want.width - b.width)
    // Height first: a box too short shrinks type, which also narrows what is painted.
    if ((spillH > FLOW_TOL || shortH > FLOW_TOL) && h < inner.height) h = clampH(h + Math.max(spillH, shortH))
    else if ((spillW > FLOW_TOL || shortW > FLOW_TOL) && w < inner.width) w = clampW(w + Math.max(spillW, shortW))
    else break
  }
  return { width: w, height: h }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* CMP1 — nested block lookup                                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

const IMAGE_TYPE = 'tls.m.image'

/** Does `block` hold a block with this id anywhere in its `blocks`-kind props (`props.children`, …)? */
export function containsBlockId(block: BlockSpec, id: string, depth = 0): boolean {
  if (!block || typeof block !== 'object' || depth > MAX_NESTING_DEPTH) return false
  const props = block.props
  if (!props || typeof props !== 'object') return false
  for (const v of Object.values(props)) {
    if (!Array.isArray(v)) continue
    for (const c of v) {
      if (!c || typeof c !== 'object' || typeof (c as BlockSpec).type !== 'string') continue
      if ((c as BlockSpec).id === id || containsBlockId(c as BlockSpec, id, depth + 1)) return true
    }
  }
  return false
}

/**
 * The wrapper group `layoutChild` drew for block `id` (its `blockId`), and its box in `root`'s
 * coordinates (group offsets summed). `undefined` when the tree does not hold it.
 */
export function findBlockGroup(root: LayoutNode, id: string): { group: Extract<LayoutNode, { k: 'group' }>; box: Box } | undefined {
  const walk = (n: LayoutNode, ox: number, oy: number): { group: Extract<LayoutNode, { k: 'group' }>; box: Box } | undefined => {
    if (n.k !== 'group') return undefined
    const x = ox + n.box.x
    const y = oy + n.box.y
    if (n.blockId === id) return { group: n, box: { x, y, width: n.box.width, height: n.box.height } }
    for (const c of n.children) {
      const hit = walk(c, x, y)
      if (hit) return hit
    }
    return undefined
  }
  // The root's own box is the block's origin (0,0); its children are relative to it.
  if (root.k !== 'group') return undefined
  for (const c of root.children) {
    const hit = walk(c, root.box.x, root.box.y)
    if (hit) return hit
  }
  return undefined
}
