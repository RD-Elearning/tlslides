/**
 * D4 — Master rendering. Pure functions for resolving a master template's blocks
 * into shapes that sit behind slide content.
 *
 * A master is a reusable background layer: named regions with default `BlockSpec`s
 * that a `SlideSpec` references via `masterId`. Master shapes are compiled with
 * low `childIndex` values so they render behind page content in the editor,
 * presentation, and `renderPageToSvg`. They are never added to `page.shapes`
 * (they are ephemeral) and cannot be selected.
 *
 * Editor-only blocks (`x.safe-area`, `x.grid-guide`) are identified here and
 * filtered out of all export paths.
 */

import type { ComponentShape } from '~types'
import type { MasterSpec, BlockSpec, Box, Paint, ResolvedTokens } from './types'
import { blockToShape } from './shape-bridge'
import { getSlideLayout, SLIDE_LAYOUTS } from './slide-layouts'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Types                                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface ResolveMasterResult {
  /** ComponentShapes produced by compiling the master's blocks. Low childIndex values. */
  shapes: ComponentShape[]
  /** Default background from the master, if any. */
  background?: Paint
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Editor-only block types                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Block types that are editor-only: visible in the live editor but must never
 * appear in any export path (SVG, PNG, PDF). These are UI affordances (safe-area
 * guides, grid overlays) that have no meaning outside the editor.
 */
const EDITOR_ONLY_TYPES = new Set<string>([
  'x.safe-area',
  'x.grid-guide',
])

/**
 * Returns `true` if the given block type is editor-only and should be filtered
 * out of all export paths (renderPageToSvg, getThumbnail, exportSlidePng).
 */
export function isEditorOnly(blockType: string): boolean {
  return EDITOR_ONLY_TYPES.has(blockType)
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* resolveMaster                                                                   */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** The layout used when `master.layout` is absent or unknown. */
const FALLBACK_LAYOUT = 'blank' as const

/**
 * Compile a master template's blocks into `ComponentShape`s with low `childIndex`
 * values, suitable for rendering behind slide content.
 *
 * 1. Look up the master by `masterId` in the `masters` record.
 * 2. Resolve layout regions (using `master.layout` or the full frame as fallback).
 * 3. Convert each block in `master.blocks` to a `ComponentShape` via `blockToShape`.
 * 4. Each shape gets a `childIndex` starting at 0 (behind all page content).
 * 5. Editor-only blocks are filtered out.
 *
 * Returns `{ shapes, background }` — the shapes array and an optional background
 * paint from the master definition.
 *
 * @param masterId  The name/key of the master to resolve.
 * @param masters   The deck's master definitions.
 * @param frame     The slide frame dimensions `{ width, height }` in slide units.
 * @param tokens    Resolved design tokens for the deck.
 * @returns The compiled master shapes and optional background, or `undefined` if
 *          `masterId` is not found.
 */
export function resolveMaster(
  masterId: string,
  masters: Record<string, MasterSpec> | undefined,
  frame: { width: number; height: number },
  tokens: ResolvedTokens
): ResolveMasterResult | undefined {
  if (!masters) return undefined
  const master = masters[masterId]
  if (!master) return undefined

  // Resolve layout regions for the master's blocks.
  const regions = resolveMasterRegions(master.layout, frame, tokens)

  const shapes: ComponentShape[] = []
  let childIndex = 0

  for (const blockName of Object.keys(master.blocks)) {
    const blockSpec: BlockSpec = master.blocks[blockName]

    // Filter out editor-only blocks.
    if (isEditorOnly(blockSpec.type)) continue

    // Determine the box for this block: use the layout region if it exists,
    // otherwise fall back to the full frame.
    const regionBox: Box = regions[blockName] ?? { x: 0, y: 0, width: frame.width, height: frame.height }

    const shape = blockToShape(blockSpec, regionBox, {
      childIndex: childIndex++,
      parentId: 'page', // same parent convention as compileSlide
    })
    shapes.push(shape)
  }

  return {
    shapes,
    background: master.background,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Internal helpers                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Resolve layout regions for a master, falling back to the blank layout
 * when the master's layout name is absent or unknown.
 */
function resolveMasterRegions(
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
  const fallback = SLIDE_LAYOUTS.find((l) => l.id === FALLBACK_LAYOUT)
  return fallback ? fallback.compile(frame, tokens) : {}
}
