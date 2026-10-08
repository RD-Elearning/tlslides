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
 * Pure and DOM-free: no `document`, no `window`, no `Date.now()`, no side effects.
 */

import type { ComponentShape } from '~types'
import type { BlockDefinition, BlockSpec, Box, MotionStyle, Paint, ResolvedTokens, SlideSpec, Size, SurfaceContext } from './types'
import { BLOCK_PROP_KEY, blockToShape } from './shape-bridge'
import { getSlideLayout, SLIDE_LAYOUTS } from './slide-layouts'
import { nearestName } from './nearest-name'
import type { BlockRegistry } from './registry'
import { createLayoutContext } from './layout'
import { layoutBlock } from './layout/layout-child'
import { effectiveMotionStyle, readingOrder, styleBlockMotion } from './motion/motion-style'
import { deriveShapeAnimation } from './motion/resolve-motion'

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
  // Pre-compute natural heights when registry is provided.
  const regionNaturalHeights = new Map<string, number>()
  const knownRegionNames = Object.keys(regionBoxes)
  const gap = tokens.space.md

  // Pre-measure blocks and compute natural heights (Pass 1 of V2.1).
  // Pre-measure blocks and compute natural heights (Pass 1 of V2.1).
  // F3.1: one fresh memo cache per compile pass.
  const intrinsicSizeCache = new Map<string, Size>()
  if (registry) {
    for (const regionName of knownRegionNames) {
      const regionBox = regionBoxes[regionName]
      const blocks = spec.regions[regionName] ?? []

      if (blocks.length === 0 || !regionBox) continue

      const measureCtx = createLayoutContext({
        box: { width: regionBox.width, height: regionBox.height },
        tokens,
        surface: MINIMAL_SURFACE,
        registry,
        intrinsicSizeCache, // F3.1: scoped memo cache
      })

      const blockHeights = blocks.map((block) => {
        const def = registry.get(block.type)
        if (!def) return -1
        try {
          // B3-H1: if the block has instance style overrides (padding/align), build a
          // per-block ctx so layoutBlock can apply them. Otherwise keep the shared ctx.
          // `style` is a top-level BlockSpec field in deck JSON (not `props.$block.style` —
          // that reserved key only exists on rendered editor shapes, see block-authoring
          // README pitfall #3/#5).
          const blockStyle = block.style
          const usePerBlock =
            blockStyle !== undefined &&
            (blockStyle.padding !== undefined || blockStyle.align !== undefined)
          const ctx = usePerBlock
            ? createLayoutContext({
                box: { width: regionBox.width, height: regionBox.height },
                tokens,
                surface: MINIMAL_SURFACE,
                registry,
                intrinsicSizeCache,
                style: blockStyle,
              })
            : measureCtx
          const node = layoutBlock(def, block.props as Record<string, unknown>, ctx)
          return node.box.height
        } catch {
          return -1
        }
      })

      // Compute natural height (measured blocks + gaps)
      const gapsTotal = blocks.length > 1 ? (blocks.length - 1) * gap : 0
      // LO0: skip a block that failed to measure (-1); never reset the running sum.
      const measuredTotal = blockHeights.reduce((sum, h) => (h > 0 ? sum + h : sum), 0)
      regionNaturalHeights.set(regionName, measuredTotal + gapsTotal)
    }
  }

  // V2.1: Re-flow region y-positions based on natural heights (Pass 2).
  // Sort regions by their layout y-position to identify vertical runs.
  const regionYPositions = new Map<string, number>()
  const regionYHeights = new Map<string, number>()

  if (registry && regionNaturalHeights.size > 0) {
    // Build a map of region -> naturalHeight for quick lookup
    const needsReFlow = Object.keys(regionBoxes).some((regionName) => {
      const naturalHeight = regionNaturalHeights.get(regionName)
      const regionBox = regionBoxes[regionName]
      return regionBox && naturalHeight && naturalHeight > regionBox.height
    })

    if (needsReFlow) {
      const sortedByY = [...knownRegionNames].sort((a, b) => {
        const boxA = regionBoxes[a]
        const boxB = regionBoxes[b]
        if (!boxA || !boxB) return 0
        return boxA.y - boxB.y
      })

      // Find the first region with content to determine run start
      const firstRegionWithContent = sortedByY.find((name) => {
        const boxes = spec.regions[name] ?? []
        return boxes.length > 0
      })

      if (firstRegionWithContent) {
        let currentY = regionBoxes[firstRegionWithContent]?.y ?? 0
        for (const regionName of sortedByY) {
          const regionBox = regionBoxes[regionName]
          if (!regionBox) continue

          const blocks = spec.regions[regionName] ?? []
          if (blocks.length === 0) continue

          const naturalHeight = regionNaturalHeights.get(regionName) ?? regionBox.height
          const effectiveHeight = Math.max(naturalHeight, regionBox.height)

          regionYPositions.set(regionName, currentY)
          regionYHeights.set(regionName, effectiveHeight)

          currentY = currentY + effectiveHeight + gap
        }
      }
    }
  }

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
      // Build a measurement context for this region.
      const measureCtx = createLayoutContext({
        box: { width: regionBox.width, height: regionBox.height },
        tokens,
        surface: MINIMAL_SURFACE,
        registry,
        intrinsicSizeCache, // F3.1: reuse scoped memo cache
      })

      blockHeights = blocks.map((block) => {
        const def = registry.get(block.type)
        if (!def) {
          // Unknown block type: fallback to equal split height (computed below).
          return -1
        }
        try {
          // B3-H1: per-block ctx when instance style overrides are present.
          // `style` is a top-level BlockSpec field in deck JSON (not `props.$block.style`).
          const blockStyle = block.style
          const usePerBlock =
            blockStyle !== undefined &&
            (blockStyle.padding !== undefined || blockStyle.align !== undefined)
          const ctx = usePerBlock
            ? createLayoutContext({
                box: { width: regionBox.width, height: regionBox.height },
                tokens,
                surface: MINIMAL_SURFACE,
                registry,
                intrinsicSizeCache,
                style: blockStyle,
              })
            : measureCtx
          const node = layoutBlock(def, block.props as Record<string, unknown>, ctx)
          return node.box.height
        } catch {
          return -1
        }
      })
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
    const regionEffectiveHeight = hasRegistry ? (regionNaturalHeights.get(regionName) ?? regionBox.height) : regionBox.height
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
  if (spec.free) {
    for (const entry of spec.free) {
      const blockDef = registry?.get(entry.block.type)
      const shape = blockToShape(entry.block, entry.box, {
        childIndex: childIndex++,
        definitionMotion: blockDef?.motion,
      })
      shapes.push(shape)
      if (blockDef && entry.block.motion === undefined) {
        styleCandidates.push({ shape, block: entry.block, def: blockDef, box: entry.box })
      }
    }
  }

  // 5. P7 — motion style. Only when a style is set; absent = the output above, untouched.
  const motionStyle = effectiveMotionStyle(spec.motionStyle, opts?.motionStyle)
  if (motionStyle) applyMotionStyle(motionStyle, styleCandidates)

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
 *    stacked blocks when they overflow or were re-flowed — and does not take part in stacking;
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

  const place = (l: LayeredRegionBlock): ComponentShape[] => {
    const box = regionExtent(l.region)
    // Unknown region: the flow compile already reported `region/unknown` for it.
    if (!box) return []
    return [blockToShape(l.block, box, { definitionMotion: registry?.get(l.block.type)?.motion })]
  }

  const shapes = [...split.backdrops.flatMap(place), ...result.shapes, ...split.overlays.flatMap(place)]
  shapes.forEach((shape, i) => {
    shape.childIndex = i + 1
  })
  return { ...result, shapes }
}
