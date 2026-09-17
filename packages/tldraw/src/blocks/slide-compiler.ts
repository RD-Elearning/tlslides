/**
 * D3 — `compileSlide`: pure function from a `SlideSpec` to an array of `ComponentShape`s.
 *
 * Looks up the slide layout, compiles it to named regions, then iterates each
 * region's `BlockSpec[]` array, stacking blocks vertically within the region box,
 * separated by `tokens.space.md`. Free-positioned blocks (`spec.free[]`) are
 * placed directly. Every shape gets a unique, monotonically-increasing `childIndex`
 * (the P18 bug prevention) across regions AND free[].
 *
 * Pure and DOM-free: no `document`, no `window`, no `Date.now()`, no side effects.
 */

import type { ComponentShape } from '~types'
import type { BlockSpec, Box, Paint, ResolvedTokens, SlideSpec } from './types'
import { blockToShape } from './shape-bridge'
import { getSlideLayout, SLIDE_LAYOUTS } from './slide-layouts'
import { nearestName } from './nearest-name'

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
 * 4. For each `spec.free[]` entry, call `blockToShape(entry.block, entry.box)` directly.
 * 5. All shapes share a single monotonically-increasing `childIndex` counter.
 * 6. Return `layout`, `slideSpecId`, and `findings: CompileFinding[]`.
 *
 * @param spec  The slide specification (regions, free, layout, metadata).
 * @param frame The slide frame dimensions `{ width, height }` in slide units.
 * @param tokens Resolved design tokens for the deck.
 * @returns Compiled shapes and pass-through metadata.
 */
export function compileSlide(
  spec: SlideSpec,
  frame: { width: number; height: number },
  tokens: ResolvedTokens
): CompileSlideResult {
  const findings: CompileFinding[] = []
  const slideId = spec.id

  // 1. Resolve layout regions.
  const { regionBoxes, isFallback } = resolveRegions(spec.layout, frame, tokens)

  if (isFallback) {
    findings.push({
      level: 'warning',
      rule: 'region/unknown',
      slideId,
      message: `Unknown layout "${spec.layout}"; falling back to "${FALLBACK_LAYOUT}".`,
    })
  }

  // 2. Convert each region's blocks to ComponentShapes, stacking vertically.
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

    // Stack blocks vertically within the region box, separated by tokens.space.md.
    const gap = tokens.space.md
    const totalBlocks = blocks.length
    const totalGap = totalBlocks > 1 ? (totalBlocks - 1) * gap : 0
    const availableHeight = regionBox.height - totalGap
    const blockHeight = totalBlocks > 0 ? availableHeight / totalBlocks : regionBox.height

    let currentY = regionBox.y

    for (const block of blocks) {
      const box: Box = {
        x: regionBox.x,
        y: currentY,
        width: regionBox.width,
        height: blockHeight,
      }

      const shape = blockToShape(block, box, { childIndex: childIndex++ })
      shapes.push(shape)
      currentY += blockHeight + gap
    }
  }

  // 3. Handle spec.free[] — place them directly using their explicit box.
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

/**
 * Look up the layout by name and compile it. Falls back to `FALLBACK_LAYOUT`
 * when `layoutId` is absent or does not match any registered layout.
 */
function resolveRegions(
  layoutId: string | undefined,
  frame: { width: number; height: number },
  tokens: ResolvedTokens
): { regionBoxes: Record<string, Box>; isFallback: boolean } {
  if (layoutId) {
    const layout = getSlideLayout(layoutId as Parameters<typeof getSlideLayout>[0])
    if (layout) {
      return { regionBoxes: layout.compile(frame, tokens), isFallback: false }
    }
  }

  // Fallback: use the blank layout (one `content` region filling the safe margin).
  const fallback = SLIDE_LAYOUTS.find((l) => l.id === FALLBACK_LAYOUT)
  return {
    regionBoxes: fallback ? fallback.compile(frame, tokens) : {},
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
