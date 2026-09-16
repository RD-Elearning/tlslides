/**
 * D3 — `compileSlide`: pure function from a `SlideSpec` to an array of `ComponentShape`s.
 *
 * Looks up the slide layout, compiles it to named regions, then converts each
 * `BlockSpec` in `spec.content` to a `ComponentShape` via `blockToShape`. Every
 * shape gets a unique `id` and a unique, monotonically-increasing `childIndex`
 * (the P18 bug prevention).
 *
 * Pure and DOM-free: no `document`, no `window`, no `Date.now()`, no side effects.
 */

import type { ComponentShape } from '~types'
import type { BlockSpec, Box, Paint, ResolvedTokens, SlideSpec } from './types'
import { blockToShape } from './shape-bridge'
import { getSlideLayout, SLIDE_LAYOUTS } from './slide-layouts'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Return type                                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface CompileSlideResult {
  /** ComponentShapes produced by mapping `spec.content` through the layout regions. */
  shapes: ComponentShape[]
  /** Propagated from `spec.background`. */
  background?: Paint
  /** Propagated from `spec.masterId`. */
  masterId?: string
  /** Propagated from `spec.notes`. */
  notes?: string
  /** Propagated from `spec.skipInPresentation`. */
  skipInPresentation?: boolean
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
 * 3. For each `spec.content[slotName]`, call `blockToShape(blockSpec, regionBox)`
 *    with a unique, incrementing `childIndex`.
 * 4. Pass through `background`, `masterId`, `notes`, `skipInPresentation`.
 *
 * Slots in `spec.content` that do not match any layout region are silently skipped —
 * this is a grace path for a partial spec, not an error. (D5 adds overflow cascade
 * for content that doesn't fit; D3 just doesn't crash.)
 *
 * @param spec  The slide specification (content, layout, metadata).
 * @param frame The slide frame dimensions `{ width, height }` in slide units.
 * @param tokens Resolved design tokens for the deck.
 * @returns Compiled shapes and pass-through metadata.
 */
export function compileSlide(
  spec: SlideSpec,
  frame: { width: number; height: number },
  tokens: ResolvedTokens
): CompileSlideResult {
  // 1. Resolve layout regions.
  const regions = resolveRegions(spec.layout, frame, tokens)

  // 2. Convert each content slot to a ComponentShape.
  const shapes: ComponentShape[] = []
  let childIndex = 1

  for (const slotName of Object.keys(spec.content)) {
    const blockSpec: BlockSpec = spec.content[slotName]
    const regionBox: Box | undefined = regions[slotName]

    if (!regionBox) {
      // Slot doesn't match any layout region — skip (graceful fallback, D5 adds overflow).
      continue
    }

    const shape = blockToShape(blockSpec, regionBox, {
      childIndex: childIndex++,
    })
    shapes.push(shape)
  }

  return {
    shapes,
    background: spec.background,
    masterId: spec.masterId,
    notes: spec.notes,
    skipInPresentation: spec.skipInPresentation,
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
): Record<string, Box> {
  if (layoutId) {
    const layout = getSlideLayout(layoutId as Parameters<typeof getSlideLayout>[0])
    if (layout) {
      return layout.compile(frame, tokens)
    }
  }

  // Fallback: use the blank layout (one `content` region filling the safe margin).
  // `SLIDE_LAYOUTS` is a const array of 16 shipped layouts; 'blank' is always present.
  const fallback = SLIDE_LAYOUTS.find((l) => l.id === FALLBACK_LAYOUT)
  return fallback ? fallback.compile(frame, tokens) : {}
}
