/**
 * Q8 — the reverse path: `TDPage → SlideSpec` and `TDDocument → DeckSpec`.
 *
 * `pageToSlideSpec` is the inverse of `compileSlide` (Q7): given a page of shapes
 * that were compiled from a `SlideSpec`, reconstruct that spec. Shapes that match a
 * layout region (within `tolerance`) are placed in `regions`; others land in `free[]`.
 * Non-block shapes (arrows, hand-placed text) emit a finding and are dropped — they
 * cannot be represented as `BlockSpec` and silently carrying them would corrupt the
 * round-trip.
 *
 * `documentToDeckSpec` walks pages in `childIndex` order, resolves tokens from the
 * document's theme, and derives `aspect` from `defaultPageSize`.
 *
 * Pure and DOM-free: no `document`, no `window`, no `Date.now()`, no `Math.random()`.
 */

import type { DeckTheme, TDDocument, TDPage } from '~types'
import { activeDeckTheme } from '~state/shapes/shared/deck-theme'
import { DEFAULT_SLIDE_SIZE, SLIDE_ASPECT_PRESETS } from '~constants'
import type { BlockSpec, Box, DeckSpec, PlacedBlock, ResolvedTokens, SlideSpec } from './types'
import { shapeToBlock } from './shape-bridge'
import { getSlideLayout, type SlideLayoutId } from './slide-layouts'
import { resolveTokens } from './tokens'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Finding type                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * A diagnostic emitted during decompilation. Every finding carries enough context
 * for the host to surface it in the Deck Doctor panel (P31).
 */
export interface DecompileFinding {
  level: 'error' | 'warning' | 'info'
  rule:
    | 'layout/missing'
    | 'shape/non-block'
    | 'shape/no-region-match'
    | 'aspect/free-block-drift'
  /** The slide/page id. */
  slideId?: string
  /** The shape id that triggered the finding. */
  blockId?: string
  message: string
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Options                                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface DecompileOptions {
  /** Max allowed deviation in slide units when matching a shape to a region box.
   *  Default: 2. */
  tolerance?: number
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Internal helpers                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Resolve the frame for a page: `page.size ?? DEFAULT_SLIDE_SIZE`. Copied, not aliased. */
function resolveFrame(page: TDPage): { width: number; height: number } {
  const size = page.size ?? DEFAULT_SLIDE_SIZE
  return { width: size[0], height: size[1] }
}

/**
 * Check if a shape matches a region box.
 *
 * A shape matches a region if:
 * - its x and width are within `tolerance` of the region's x and width
 * - its top edge is within `tolerance` of (or below) the region's top
 *
 * Note: the bottom edge is intentionally NOT checked. With intrinsic-height
 * stacking, a block can legitimately extend past its region's bottom edge
 * (e.g. a display-sized title). x, width, and top are sufficient to identify
 * a region. The compiler emits a `region/overflow` finding for such blocks.
 */
function shapeMatchesRegion(
  shape: { point: number[]; size: number[] },
  regionBox: Box,
  tolerance: number
): boolean {
  const xOk = Math.abs(shape.point[0] - regionBox.x) <= tolerance
  const wOk = Math.abs(shape.size[0] - regionBox.width) <= tolerance
  const yOk = shape.point[1] >= regionBox.y - tolerance
  return xOk && wOk && yOk
}

/**
 * Find the best-matching region for a shape. Returns the region name, or undefined
 * if no region matches within tolerance.
 *
 * When a shape matches multiple regions (unlikely but possible at boundaries),
 * the one with the smallest y-distance from the shape's top to the region's top wins.
 */
function matchToRegion(
  shape: { point: number[]; size: number[] },
  regionBoxes: Record<string, Box>,
  tolerance: number
): string | undefined {
  let bestName: string | undefined
  let bestDist = Infinity

  for (const [name, box] of Object.entries(regionBoxes)) {
    if (shapeMatchesRegion(shape, box, tolerance)) {
      const dist = Math.abs(shape.point[1] - box.y)
      if (dist < bestDist) {
        bestDist = dist
        bestName = name
      }
    }
  }

  return bestName
}

/**
 * Derive a `DeckSpec.aspect` from a `[width, height]` page size.
 *
 * Matches against `SLIDE_ASPECT_PRESETS` by value comparison; returns the named
 * preset when matched, or the raw `[w, h]` array when no preset fits.
 */
function deriveAspect(pageSize: number[]): DeckSpec['aspect'] {
  const [w, h] = pageSize
  if (w === SLIDE_ASPECT_PRESETS.widescreen[0] && h === SLIDE_ASPECT_PRESETS.widescreen[1]) {
    return 'widescreen'
  }
  if (w === SLIDE_ASPECT_PRESETS.standard[0] && h === SLIDE_ASPECT_PRESETS.standard[1]) {
    return 'standard'
  }
  if (w === SLIDE_ASPECT_PRESETS.square[0] && h === SLIDE_ASPECT_PRESETS.square[1]) {
    return 'square'
  }
  return [w, h]
}

/**
 * Check if two aspect values are equal. Named presets are compared by string;
 * array forms are compared element-wise.
 */
function aspectsEqual(a: DeckSpec['aspect'], b: DeckSpec['aspect']): boolean {
  if (typeof a === 'string' && typeof b === 'string') return a === b
  if (Array.isArray(a) && Array.isArray(b)) {
    return a[0] === b[0] && a[1] === b[1]
  }
  return false
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* pageToSlideSpec                                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Decompile a `TDPage` back into a `SlideSpec`.
 *
 * 1. Read `page.layout`. If absent — a page authored before this work, or drawn
 *    by hand — fall back to `'blank'` and put every shape in `free[]`, with one
 *    finding. Never guess a layout from geometry.
 * 2. Re-compile the region boxes via `getSlideLayout(page.layout).compile(frame, tokens)`.
 * 3. For each shape, in `childIndex` order:
 *    - `shapeToBlock(shape)` → `BlockSpec | undefined`. `undefined` means a non-block
 *      shape: emit a `shape/non-block` finding and drop it (cannot be represented as
 *      BlockSpec; carrying it as opaque free[] would corrupt the round-trip).
 *    - Match the shape's `{point, size}` against every region box within `tolerance`.
 *      On a match, append to `regions[name]`. Otherwise append to `free[]`.
 *    - When a region holds several blocks, sort by `point[1]` (vertical order).
 *
 * Known limitation: a block moved *within* its region's tolerance is snapped back to
 * region order on the round trip — its exact pixel offset is not preserved.
 *
 * @param page   The TDPage to decompile.
 * @param tokens Resolved design tokens for the deck.
 * @param opts   Options (tolerance, default 2 slide units).
 * @returns      The reconstructed SlideSpec and any findings.
 */
export function pageToSlideSpec(
  page: TDPage,
  tokens: ResolvedTokens,
  opts?: DecompileOptions
): { spec: SlideSpec; findings: DecompileFinding[] } {
  const tolerance = opts?.tolerance ?? 2
  const findings: DecompileFinding[] = []
  const slideId = page.slideSpecId ?? page.id ?? 'unknown'

  // 1. Resolve the frame and layout.
  const frame = resolveFrame(page)
  const layoutId = (page.layout as SlideLayoutId) ?? 'blank'

  if (!page.layout) {
    findings.push({
      level: 'warning',
      rule: 'layout/missing',
      slideId,
      message: `Page "${slideId}" has no layout; falling back to "blank". All shapes placed in free[].`,
    })
  }

  // 2. Compile region boxes — the same function Q7 used, so the two are
  //    structurally consistent.
  const layout = getSlideLayout(layoutId)
  const regionBoxes = layout ? layout.compile(frame, tokens) : {}

  // 3. Walk ALL shapes in childIndex order. We process every shape so that
  //    non-block shapes (arrows, hand-placed text) emit a finding instead of
  //    being silently ignored.
  const allShapes = Object.values(page.shapes)
    .sort((a, b) => a.childIndex - b.childIndex)

  // Intermediate structure: track y alongside BlockSpec for sorting.
  interface RegionEntry {
    block: BlockSpec
    y: number
  }
  const regionEntries: Record<string, RegionEntry[]> = {}
  const free: PlacedBlock[] = []

  for (const shape of allShapes) {
    const blockSpec = shapeToBlock(shape)

    if (!blockSpec) {
      // Non-block shape (arrow, hand-placed text): emit finding and drop.
      // Rationale for dropping rather than carrying as opaque free[]: PlacedBlock
      // requires a BlockSpec; inventing one would corrupt the round-trip.
      findings.push({
        level: 'warning',
        rule: 'shape/non-block',
        slideId,
        blockId: shape.id,
        message: `Shape "${shape.id}" (type: ${shape.type}) is not a block; dropped from SlideSpec.`,
      })
      continue
    }

    // Match against region boxes. All shapes have `point` (from TLShape), but only
    // ComponentShape has `size`. Shapes without `size` cannot be matched to regions.
    const shapePoint = (shape as { point: number[] }).point
    const shapeSize = (shape as { size?: number[] }).size
    if (!shapePoint || !shapeSize) {
      // Shape without point/size — skip.
      continue
    }
    const shapeForMatch = { point: shapePoint, size: shapeSize }
    const matchedRegion = matchToRegion(shapeForMatch, regionBoxes, tolerance)

    if (matchedRegion) {
      if (!regionEntries[matchedRegion]) regionEntries[matchedRegion] = []
      regionEntries[matchedRegion].push({ block: blockSpec, y: shapePoint[1] })
    } else {
      free.push({
        block: blockSpec,
        box: {
          x: shapePoint[0],
          y: shapePoint[1],
          width: shapeSize[0],
          height: shapeSize[1],
        },
      })
      findings.push({
        level: 'info',
        rule: 'shape/no-region-match',
        slideId,
        blockId: blockSpec.id,
        message: `Block "${blockSpec.id}" does not match any region in the "${layoutId}" layout; placed in free[].`,
      })
    }
  }

  // 4. Sort each region's blocks by y-coordinate (vertical order) so the array
  //    order matches what Q7's compileSlide will re-compile.
  const regions: Record<string, BlockSpec[]> = {}
  for (const [name, entries] of Object.entries(regionEntries)) {
    entries.sort((a, b) => a.y - b.y)
    regions[name] = entries.map((e) => e.block)
  }

  // 5. Build the SlideSpec.
  const spec: SlideSpec = {
    id: slideId,
    layout: layoutId,
    regions,
  }

  if (free.length > 0) {
    spec.free = free
  }

  // Propagate optional metadata.
  if (page.background !== undefined) {
    // Copy background to avoid aliasing the page's own object.
    spec.background = JSON.parse(JSON.stringify(page.background))
  }
  if (page.notes !== undefined) {
    spec.notes = page.notes
  }
  if (page.skipInPresentation !== undefined) {
    spec.skip = page.skipInPresentation
  }
  if (page.masterId !== undefined) {
    spec.masterId = page.masterId
  }

  return { spec, findings }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* documentToDeckSpec                                                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Decompile a full `TDDocument` back into a `DeckSpec`.
 *
 * Walks pages in `childIndex` order, reads `theme`/`tokens`/`masters` off the
 * document, and derives `aspect` from `defaultPageSize`.
 *
 * When `free[]` is non-empty and the target aspect differs from the one the
 * coordinates were authored at, emits `aspect/free-block-drift`. Does not rescale.
 *
 * @param doc  The TDDocument to decompile.
 * @param opts Options (tolerance, default 2 slide units).
 * @returns    The reconstructed DeckSpec and any findings.
 */
export function documentToDeckSpec(
  doc: TDDocument,
  opts?: DecompileOptions
): { spec: DeckSpec; findings: DecompileFinding[] } {
  const findings: DecompileFinding[] = []

  // 1. Resolve tokens from the document's theme + token overrides.
  const theme: DeckTheme = activeDeckTheme(doc.theme)
  const tokens: ResolvedTokens = resolveTokens(theme, doc.tokens)

  // 2. Derive aspect from defaultPageSize.
  const pageSize = doc.defaultPageSize ?? [...DEFAULT_SLIDE_SIZE]
  const aspect = deriveAspect(pageSize)

  // 3. Walk pages in childIndex order.
  const pages = Object.values(doc.pages).sort(
    (a, b) => (a.childIndex ?? 0) - (b.childIndex ?? 0)
  )

  const slides: SlideSpec[] = []

  for (const page of pages) {
    const { spec, findings: pageFindings } = pageToSlideSpec(page, tokens, opts)
    slides.push(spec)
    findings.push(...pageFindings)

    // 5. Aspect + free[]: when free[] is non-empty and the target aspect differs
    //    from the one the coordinates were authored at, emit a finding.
    if (spec.free && spec.free.length > 0) {
      const pageFrame = resolveFrame(page)
      const pageAspect = deriveAspect([pageFrame.width, pageFrame.height])
      if (!aspectsEqual(pageAspect, aspect)) {
        findings.push({
          level: 'warning',
          rule: 'aspect/free-block-drift',
          slideId: spec.id,
          message:
            `Page "${spec.id}" has free blocks authored at aspect ${JSON.stringify(pageAspect)} ` +
            `but target aspect is ${JSON.stringify(aspect)}. Free blocks are not rescaled.`,
        })
      }
    }
  }

  return {
    spec: {
      version: 1,
      id: doc.id,
      title: doc.name,
      theme: (doc.theme ?? theme) as unknown as DeckSpec['theme'],
      aspect,
      tokens: doc.tokens as Record<string, unknown> | undefined,
      masters: doc.masters ? Object.values(doc.masters) : undefined,
      slides,
    },
    findings,
  }
}
