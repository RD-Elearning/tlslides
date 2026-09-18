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
 * Pure and DOM-free: no `document`, no `window`, no `Date.now()`, no side effects.
 */

import type { ComponentShape } from '~types'
import type { Box, Paint, ResolvedTokens, SlideSpec, SurfaceContext } from './types'
import { blockToShape } from './shape-bridge'
import { getSlideLayout, SLIDE_LAYOUTS } from './slide-layouts'
import { nearestName } from './nearest-name'
import type { BlockRegistry } from './registry'
import { createLayoutContext } from './layout'

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
  registry?: BlockRegistry
): CompileSlideResult {
  const findings: CompileFinding[] = []
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

  // 3. Convert each region's blocks to ComponentShapes, stacking vertically.
  const shapes: ComponentShape[] = []
  let childIndex = 1

  const knownRegionNames = Object.keys(regionBoxes)

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
    const gap = tokens.space.md

    if (blocks.length === 0) {
      // Empty region — no shapes.
      continue
    }

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
      })

      blockHeights = blocks.map((block) => {
        const def = registry.get(block.type)
        if (!def) {
          // Unknown block type: fallback to equal split height (computed below).
          return -1
        }
        try {
          const node = def.layout(block.props as Record<string, unknown>, measureCtx)
          // Read the root node's box.height — every text block already measures;
          // containers report their preferred height.
          return node.box.height
        } catch {
          // Block layout threw: fallback to equal split.
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

    // Distribute leftover space per vertical alignment.
    const totalAssigned = finalHeights.reduce((sum, h) => sum + h, 0) + gapsTotal
    const leftover = regionBox.height - totalAssigned

    let offset = 0
    if (regionAlign === 'center') {
      offset = Math.max(0, leftover / 2)
    } else if (regionAlign === 'end') {
      offset = Math.max(0, leftover)
    }
    // 'start': offset = 0 (default)

    let currentY = regionBox.y + offset

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

      const shape = blockToShape(block, box, { childIndex: childIndex++ })
      shapes.push(shape)
      currentY += blockHeight + gap
    }
  }

  // 4. Handle spec.free[] — place them directly using their explicit box.
  if (spec.free) {
    for (const entry of spec.free) {
      const shape = blockToShape(entry.block, entry.box, { childIndex: childIndex++ })
      shapes.push(shape)
    }
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
