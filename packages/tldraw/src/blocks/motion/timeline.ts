/**
 * R6 — Block show duration and slide timeline.
 *
 * Pure, DOM-free functions that tell the backend, the viewer, and the digest
 * exactly how long a block takes to appear and when each block of a slide
 * starts and ends.
 *
 * `blockShowDuration` computes a single block's timing: delay, active animation,
 * and total. `slideTimeline` computes the full timeline of a slide — grouped into
 * steps by trigger semantics — by iterating the SlideSpec's blocks, resolving
 * each block's motion, and computing timing directly.
 *
 * Both functions are DOM-free: no `document`, no `window`, no browser APIs.
 */

import { AnimationTrigger } from '~types'
import type { ComponentShape, TDPage } from '~types'
import { resolveBlockMotion, resolvePartMotion } from './resolve-motion'
import { MOTION_PRESETS } from './presets'
import { DURATION_TOKENS } from './tokens'
import type { BlockSpec, BlockDefinition, LayoutNode, SlideSpec, ResolvedTokens, Size } from '../types'
import type { BlockRegistry } from '../registry'
import { createLayoutContext } from '../layout'
import { layoutBlock } from '../layout/layout-child'
import { resolveTokens } from '../tokens'
import { compileSlide } from '../slide-compiler'
import { shapeToBlock } from '../shape-bridge'
import { computeBuildSteps, stepDurationMs } from '~state/deck/presentation'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type { SurfaceContext } from '../types'

/** Minimal surface context for part-count layout calls. */
const MINIMAL_SURFACE: SurfaceContext = {
  behind: { type: 'solid', color: '#ffffff' },
  luminance: 1,
  overImage: false,
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Types                                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface BlockShowDuration {
  /** Delay in ms before the block starts animating. */
  delayMs: number
  /** Active animation duration in ms (from first frame to fully visible). */
  activeMs: number
  /** Total duration in ms: delayMs + activeMs. */
  totalMs: number
}

export interface SlideTimelineBlock {
  /** Block id (the authored `$block.id`, stable across compiles — not the random shape id). */
  id: string
  /** Absolute start time in ms (relative to slide start). */
  startsAtMs: number
  /** Absolute end time in ms. */
  endsAtMs: number
  /** This block's own animation duration in ms (relative). */
  durationMs: number
  /** The trigger that activated this block. */
  trigger: AnimationTrigger
  /** True when this block waits for a human advance (its own trigger is `onClick`). */
  isClickGated: boolean
}

export interface SlideTimelineStep {
  /** Step index (0-based). */
  index: number
  /** Absolute start time in ms. */
  startsAtMs: number
  /** Absolute end time in ms (when all blocks in this step have finished). */
  endsAtMs: number
  /** This step's own duration in ms, relative to its start — never human click-wait time. */
  durationMs: number
  /** True when this step only reveals on a human advance (contains an `onClick` cue). */
  isClickGated: boolean
  /** Blocks in this step. */
  blocks: SlideTimelineBlock[]
}

export interface SlideTimeline {
  /** Ordered steps. */
  steps: SlideTimelineStep[]
  /** Auto-play time in ms: the sum of every step's own duration. Human click-wait time is
   *  never included (a click-gated step contributes only its animation duration, not the
   *  unbounded time a person may take to decide). */
  totalMs: number
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Default compilation context                                                     */
/* ─────────────────────────────────────────────────────────────────────────────── */

const DEFAULT_FRAME: Size = { width: 1920, height: 1080 }

/** Lazily resolved default tokens — computed once per process, not per call. */
let _defaultTokens: ResolvedTokens | undefined

function getDefaultTokens(): ResolvedTokens {
  if (!_defaultTokens) {
    try {
      _defaultTokens = resolveTokens(DEFAULT_DECK_THEME)
    } catch {
      // Fallback: minimal tokens so the function never throws.
      _defaultTokens = createFallbackTokens()
    }
  }
  return _defaultTokens
}

/**
 * Minimal fallback tokens when resolveTokens fails. Sufficient for part
 * counting (the exact values don't affect how many parts a layout produces).
 */
function createFallbackTokens(): ResolvedTokens {
  return {
    color: {
      surface: '#ffffff', surfaceAlt: '#f3f4f6', accent: '#3b82f6', accent2: '#8b5cf6',
      text: '#111827', textMuted: '#6b7280', positive: '#10b981', negative: '#ef4444',
      warning: '#f59e0b', neutral: '#9ca3af', line: '#d1d5db', scrim: '#00000080',
    },
    categorical: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
    space: { '3xs': 4, '2xs': 8, xs: 12, sm: 16, md: 24, lg: 32, xl: 48, '2xl': 64, '3xl': 96, '4xl': 128 },
    radius: { none: 0, sm: 8, md: 16, lg: 24, xl: 32, pill: 9999 },
    type: {
      display: { size: 72, lineHeight: 1.1 }, title: { size: 56, lineHeight: 1.15 },
      heading: { size: 40, lineHeight: 1.2 }, subheading: { size: 28, lineHeight: 1.3 },
      lead: { size: 24, lineHeight: 1.4 }, body: { size: 20, lineHeight: 1.5 },
      caption: { size: 16, lineHeight: 1.4 }, footnote: { size: 14, lineHeight: 1.35 },
    },
    elevation: {
      0: { level: 0, dx: 0, dy: 0, blur: 0, color: 'transparent', shadow: 'none' },
      1: { level: 1, dx: 0, dy: 2, blur: 8, color: '#00000014', shadow: '0 2px 8px #00000014' },
      2: { level: 2, dx: 0, dy: 4, blur: 16, color: '#0000001a', shadow: '0 4px 16px #0000001a' },
    },
    motion: {
      duration: { ...DURATION_TOKENS, normal: DURATION_TOKENS.medium },
      ease: { linear: 'linear', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out' },
    },
    density: 'default',
    fontFamily: '"Source Sans Pro", sans-serif',
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* LayoutContext for part counting                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Create a minimal LayoutContext for counting parts. DOM-free, cheap, reusable.
 * The exact box and token values don't affect which `part` names the layout
 * produces — only the number of items (e.g., list length) does.
 *
 * Cached **per registry**: a context built with one registry must never be handed to a
 * lookup that expects another's part counts (the bug a single module-level slot had — a
 * second `slideTimeline(..., otherRegistry)` silently reused the first registry's context).
 */
const _partCountCtxByRegistry = new WeakMap<BlockRegistry, ReturnType<typeof createLayoutContext>>()
let _partCountCtxNoRegistry: ReturnType<typeof createLayoutContext> | undefined

function getPartCountContext(registry?: BlockRegistry): ReturnType<typeof createLayoutContext> {
  if (registry) {
    const cached = _partCountCtxByRegistry.get(registry)
    if (cached) return cached
    const ctx = createPartCountContext(registry)
    _partCountCtxByRegistry.set(registry, ctx)
    return ctx
  }
  if (!_partCountCtxNoRegistry) {
    _partCountCtxNoRegistry = createPartCountContext(undefined)
  }
  return _partCountCtxNoRegistry
}

function createPartCountContext(
  registry?: BlockRegistry
): ReturnType<typeof createLayoutContext> {
  return createLayoutContext({
    box: { width: DEFAULT_FRAME.width, height: DEFAULT_FRAME.height },
    tokens: getDefaultTokens(),
    surface: MINIMAL_SURFACE,
    registry,
    headless: true,
  })
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Part counting                                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Recursively count LayoutNode parts (nodes with a `part` attribute, excluding 'root').
 */
function countPartNodes(node: LayoutNode): number {
  let count = 0
  if ('part' in node && node.part && node.part !== 'root') {
    count++
  }
  if ('children' in node && node.children) {
    for (const child of node.children) {
      count += countPartNodes(child)
    }
  }
  return count
}

/**
 * Check if a recipe's parts array contains glob patterns (e.g., 'item[*].marker').
 * Glob patterns mean the layout produces a dynamic number of parts.
 */
function hasGlobParts(parts: string[] | undefined): boolean {
  if (!parts) return false
  for (const p of parts) {
    if (p.includes('[*]')) return true
  }
  return false
}

/**
 * Count the number of animatable parts a block produces.
 *
 * For the common case (no glob patterns in recipe), returns the recipe's
 * declared part count directly — no layout call needed.
 *
 * For glob-pattern recipes (e.g., 'item[*].marker'), calls `def.layout()`
 * with a minimal DOM-free context to count the actual parts.
 *
 * Falls back to the recipe's declared part count when layout throws.
 */
export function countLayoutParts(
  spec: BlockSpec,
  def: BlockDefinition,
  registry?: BlockRegistry
): number {
  const parts = def.motion?.parts

  // Fast path: no parts declared → 0 parts.
  if (!parts || parts.length === 0) return 0

  // Fast path: no glob patterns → use the recipe's declared count.
  if (!hasGlobParts(parts)) return parts.length

  // Slow path: glob patterns → call layout to count actual instances.
  const ctx = getPartCountContext(registry)
  try {
    const node = layoutBlock(def, spec.props as Record<string, unknown>, ctx)
    return countPartNodes(node)
  } catch {
    return parts.length
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* blockShowDuration                                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Compute how long a block takes to fully appear.
 *
 * - `delayMs`: time before the block starts animating (from spec.motion.delay).
 * - `activeMs`: time from the block's first frame to fully visible.
 *   Formula: `presetDuration + stagger × (partCount − 1) + longestPartOverride`
 * - `totalMs`: delayMs + activeMs.
 *
 * Ambient presets (e.g. ken-burns) return `{ delayMs: 0, activeMs: 0, totalMs: 0 }`
 * because they loop indefinitely and are excluded from timeline planning.
 *
 * DOM-free: the layout call for part counting uses a minimal DOM-free LayoutContext.
 *
 * @param spec The block instance spec.
 * @param def  The block definition (from the registry).
 * @param registry Optional block registry (for layout context).
 * @param partCountOverride Optional pre-computed part count (avoids re-running layout).
 */
export function blockShowDuration(
  spec: BlockSpec,
  def: BlockDefinition,
  registry?: BlockRegistry,
  partCountOverride?: number
): BlockShowDuration {
  // 1. Resolve block-level motion.
  const resolved = resolveBlockMotion(spec.motion, def.motion)

  // 2. No animation → block appears instantly.
  if (resolved.effect === null) {
    return { delayMs: 0, activeMs: 0, totalMs: 0 }
  }

  const delayMs = resolved.delayMs
  const baseDuration = resolved.durationMs

  // 3. Check if the preset is ambient (excluded from timeline).
  const presetId = spec.motion?.preset ?? def.motion?.preset ?? 'fade'
  const preset = MOTION_PRESETS[presetId]
  if (preset?.isAmbient) {
    return { delayMs: 0, activeMs: 0, totalMs: 0 }
  }

  // 4. Count layout parts for stagger calculation.
  const partCount = partCountOverride ?? countLayoutParts(spec, def, registry)

  // 5. Get the preset's stagger interval.
  const staggerMs = preset?.staggerMs ?? 0

  // 6. Resolve part motions to find the longest part override beyond base duration.
  const partMotions = resolvePartMotion(spec.motion, def.motion)
  let longestPartOverride = 0
  for (const pm of partMotions) {
    if (pm.isAmbient) continue
    const excess = pm.durationMs - baseDuration
    if (excess > longestPartOverride) {
      longestPartOverride = excess
    }
  }

  // 7. Calculate activeMs.
  const effectiveStaggerCount = Math.max(0, partCount - 1)
  const activeMs = baseDuration + staggerMs * effectiveStaggerCount + longestPartOverride

  return { delayMs, activeMs, totalMs: delayMs + activeMs }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* slideTimeline                                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Compute the full timeline of a slide — when each block starts and ends, grouped into steps
 * by trigger semantics.
 *
 * **Source of truth.** The timeline is built from the *compiled page* — `computeBuildSteps` plus
 * each shape's persisted `ShapeAnimation` — never from the raw `DeckSpec`. A `SlideSpec` input is
 * compiled (with the supplied registry) first, so an in-editor edit to a delay is reflected
 * exactly as playback sees it. This is the R6 Watch-out ("or the two disagree the moment a person
 * edits a delay in the editor") made structural.
 *
 * **Agreement with the runtime.** Step boundaries are computed with
 * `state/deck/presentation.ts`'s own `stepDurationMs` — `max(delayMs + durationMs)` across the
 * step's shapes — so `slideTimeline().totalMs` equals the time the real auto-advance chain takes
 * to play every step, by construction.
 *
 * **Click-gated steps.** Each step exposes a relative `durationMs` and `isClickGated`; `totalMs`
 * is the sum of those durations only, so a caller never folds unbounded human click-wait time
 * into the sum.
 *
 * @param input    The slide specification, or an already-compiled page.
 * @param registry The block registry (for compilation and part counting).
 */
export function slideTimeline(
  input: SlideSpec | TDPage,
  registry: BlockRegistry
): SlideTimeline {
  const page = isPage(input)
    ? input
    : compileToPage(input, registry)

  const buildSteps = computeBuildSteps(page)
  if (buildSteps.length === 0) {
    return { steps: [], totalMs: 0 }
  }

  const steps: SlideTimelineStep[] = []
  let absoluteTime = 0

  for (let i = 0; i < buildSteps.length; i++) {
    const buildStep = buildSteps[i]
    const durationMs = stepDurationMs(page, buildStep)
    const startsAtMs = absoluteTime

    const blocks: SlideTimelineBlock[] = buildStep.shapeIds.map((shapeId) => {
      const shape = page.shapes[shapeId]
      const animation = shape?.animation
      const trigger = animation?.trigger ?? AnimationTrigger.WithPrevious
      const blockId = shape ? shapeToBlock(shape)?.id ?? shapeId : shapeId
      const blockStart = startsAtMs + (animation?.delayMs ?? 0)
      return {
        id: blockId,
        startsAtMs: blockStart,
        endsAtMs: blockStart + (animation?.durationMs ?? 0),
        durationMs: animation?.durationMs ?? 0,
        trigger,
        isClickGated: trigger === AnimationTrigger.OnClick,
      }
    })

    steps.push({
      index: i,
      startsAtMs,
      endsAtMs: startsAtMs + durationMs,
      durationMs,
      isClickGated: !buildStep.auto,
      blocks,
    })

    absoluteTime += durationMs
  }

  return { steps, totalMs: absoluteTime }
}

/** A `TDPage` carries `shapes`; a `SlideSpec` carries `regions`. */
function isPage(input: SlideSpec | TDPage): input is TDPage {
  return 'shapes' in input && (input as TDPage).shapes !== undefined
}

/** Compile a `SlideSpec` to a minimal page-shaped object so `computeBuildSteps` can read it. */
function compileToPage(slide: SlideSpec, registry: BlockRegistry): TDPage {
  const { shapes } = compileSlide(slide, DEFAULT_FRAME, getDefaultTokens(), registry)
  const byId: Record<string, ComponentShape> = {}
  for (const shape of shapes) byId[shape.id] = shape
  return {
    id: slide.id,
    name: slide.id,
    childIndex: 0,
    shapes: byId,
    bindings: {},
    size: [DEFAULT_FRAME.width, DEFAULT_FRAME.height],
  } as unknown as TDPage
}
