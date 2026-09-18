/**
 * Motion resolution (05-motion-system.md §5.8) — bridges a block's declarative motion recipe
 * and a spec's motion overrides into concrete animation descriptors that PresentationRuntime
 * (block-level) and the WAAPI driver (part-level) can consume directly.
 *
 * Pure function: no DOM, no React, no side effects. The resolver reads the motion preset
 * catalogue, the motion token scale, and the block definition's `MotionRecipe`; it does not
 * import or depend on any browser API.
 *
 * **Block-level vs. part-level.** A block's `MotionRecipe` declares named parts (the building
 * blocks that `layout()` emits with a `part` tag). The block-level reveal — the whole container
 * entering the stage — is a `ShapeAnimation` (`effect`, `trigger`, `order`, `durationMs`,
 * `delayMs`) that `computeBuildSteps` already knows how to drive. Part-level motion — per-part
 * stagger, pop, draw-path — is resolved here into concrete `MotionKeyframes` + timing that the
 * WAAPI driver executes inside the block's own Component (which is the only safe place: the
 * block's DOM is its own, and the driver only touches `opacity`/`translate`/`scale`/etc.,
 * never `transform`).
 */

import { AnimationEffect, AnimationTrigger } from '~types'
import type { ShapeAnimation } from '~types'
import type { BlockMotionSpec, PartMotionSpec, MotionRecipe, EaseToken, DurationToken } from '../types'
import { MOTION_PRESETS, type MotionPreset } from './presets'
import { DURATION_TOKENS, EASING_TOKENS } from './tokens'
import type { MotionKeyframes } from './driver'

// --- Preset → AnimationEffect mapping -----------------------------------------------------------

/**
 * Map a motion preset id to the block-level `AnimationEffect` that PresentationRuntime
 * drives. The preset catalogue has 35 entries; the block-level reveal only needs four
 * effects (FadeIn, SlideIn, ZoomIn, Wipe) because the whole container enters as one unit.
 * Richer preset behaviour (stagger, draw-path, etc.) is for part-level motion inside the
 * block, not for the block-level entrance.
 *
 * `null` means "no animation" (the `none` preset or an unknown id).
 */
export function presetToEffect(presetId: string): AnimationEffect | null {
  switch (presetId) {
    case 'fade':
    case 'fade-up':
    case 'fade-down':
    case 'stagger-lines':
    case 'stagger-children':
    case 'stagger-grid':
    case 'words-in':
    case 'reveal-down':
    case 'sweep-nodes':
    case 'split-in':
    case 'field-in':
    case 'cover-in':
    case 'closing-in':
      return AnimationEffect.FadeIn

    case 'pop':
    case 'pop-points':
    case 'count-up':
      return AnimationEffect.ZoomIn

    case 'wipe-x':
    case 'wipe-y':
    case 'mask-reveal':
      return AnimationEffect.Wipe

    case 'none':
      return null

    // Chained, composite, and unknown presets default to FadeIn for the block-level entrance.
    default:
      return AnimationEffect.FadeIn
  }
}

// --- Duration / easing token resolution ----------------------------------------------------------

/** Resolve a `DurationToken` name or raw millisecond number to ms. */
function resolveDuration(value: DurationToken | number | undefined, fallback: number): number {
  if (typeof value === 'number') return value
  if (value !== undefined && value in DURATION_TOKENS) return DURATION_TOKENS[value as keyof typeof DURATION_TOKENS]
  return fallback
}

/** Resolve an `EaseToken` name to a CSS easing string.
 *  `EaseToken` values are CSS easing keywords (`'linear'`, `'ease-in-out'`, etc.) — when
 *  the value is already a valid CSS string it passes through directly. When it's a key in
 *  the motion token scale (`EASING_TOKENS`), it's resolved from that scale. */
function resolveEasing(value: EaseToken | undefined, fallback: string): string {
  if (value === undefined) return fallback
  if (value in EASING_TOKENS) return EASING_TOKENS[value as keyof typeof EASING_TOKENS]
  // EaseToken values are already CSS easing strings — pass through.
  return value
}

// --- Block-level resolution --------------------------------------------------------------------

/**
 * Result of resolving a block's motion spec for the block-level reveal. This is what
 * `blockToShape` needs to build a `ShapeAnimation` for `computeBuildSteps`.
 */
export interface ResolvedBlockMotion {
  /** The effect PresentationRuntime applies. `null` means no block-level animation. */
  effect: AnimationEffect | null
  /** The trigger type. */
  trigger: AnimationTrigger
  /** Build order within the slide. */
  order: number
  /** Duration in ms. */
  durationMs: number
  /** Delay in ms. */
  delayMs: number
}

/** Default block-level timing when the spec doesn't override. */
const BLOCK_DURATION_FALLBACK = 400

/**
 * Resolve the block-level motion (the entrance of the whole container).
 *
 * Priority chain: `spec.motion.preset` → `definition.motion.preset` → `'fade'` (safe default).
 * Duration/delay come from `spec.motion` when numeric; otherwise the preset's token is used.
 */
export function resolveBlockMotion(
  specMotion: BlockMotionSpec | undefined,
  definitionMotion: MotionRecipe
): ResolvedBlockMotion {
  // When neither spec nor definition declares a preset and the definition has an
  // empty (or absent) motion recipe, there is no block-level animation — return
  // effect: null.  The 'fade' fallback only applies when *something* in the
  // motion chain expressed intent (a preset, a trigger, or non-empty recipe).
  const hasMotionIntent =
    specMotion?.preset !== undefined ||
    specMotion?.trigger !== undefined ||
    specMotion?.order !== undefined ||
    definitionMotion.preset !== undefined
  const presetId = specMotion?.preset ?? definitionMotion.preset ?? (hasMotionIntent ? 'fade' : 'none')
  const effect = presetToEffect(presetId)
  const preset = MOTION_PRESETS[presetId]
  const fallbackDuration = preset ? DURATION_TOKENS[preset.duration] : BLOCK_DURATION_FALLBACK

  return {
    effect,
    trigger: specMotion?.trigger ?? AnimationTrigger.WithPrevious,
    order: specMotion?.order ?? 0,
    durationMs: resolveDuration(specMotion?.duration, fallbackDuration),
    delayMs: resolveDuration(specMotion?.delay, 0),
  }
}

// --- Part-level resolution ---------------------------------------------------------------------

/**
 * Concrete animation descriptor for a single named part inside a block.
 * The WAAPI driver consumes this directly: `driver.play(el, keyframes, opts)`.
 */
export interface ResolvedPartMotion {
  /** Part name (matches `data-part` in the DOM). */
  partName: string
  /** Keyframes for the WAAPI driver. */
  keyframes: MotionKeyframes
  /** Duration in ms. */
  durationMs: number
  /** Delay in ms (includes any stagger offset). */
  delayMs: number
  /** CSS easing string. */
  easing: string
  /** Whether this preset is ambient (loops). */
  isAmbient: boolean
  /** The resolved preset id for this part — used by `playBlockReveal` to detect
   *  special presets like `count-up` that need a textContent tween. */
  presetId?: string
}

/**
 * Resolve part-level motion for every part declared by the block definition's recipe,
 * applying any overrides from the spec's `motion.parts`.
 *
 * Returns an array in declaration order (the order `MotionRecipe.parts` lists them).
 * Parts not listed in `MotionRecipe.parts` get no part-level motion.
 * A spec-level part override can set its own preset, duration, delay, and easing;
 * if absent, the block-level preset's keyframes cascade to the part (stagger presets
 * already carry `staggerMs` for exactly this).
 */
export function resolvePartMotion(
  specMotion: BlockMotionSpec | undefined,
  definitionMotion: MotionRecipe
): ResolvedPartMotion[] {
  const parts = definitionMotion.parts
  if (!parts || parts.length === 0) return []

  // The effective block-level preset, used as the default for parts that don't override.
  const blockPresetId = specMotion?.preset ?? definitionMotion.preset ?? 'fade'
  const blockPreset = MOTION_PRESETS[blockPresetId]
  const blockDuration = resolveDuration(
    specMotion?.duration,
    blockPreset ? DURATION_TOKENS[blockPreset.duration] : BLOCK_DURATION_FALLBACK
  )
  const blockEasing = resolveEasing(
    specMotion?.ease as EaseToken | undefined,
    blockPreset ? EASING_TOKENS[blockPreset.easing] : 'cubic-bezier(0.22, 1, 0.36, 1)'
  )
  const staggerMs = blockPreset?.staggerMs ?? 0

  return parts.map((partName, index) => {
    const partOverride: PartMotionSpec | undefined = specMotion?.parts?.[partName]

    // Determine the preset for this part.
    const partPresetId = partOverride?.preset ?? blockPresetId
    const partPreset: MotionPreset | undefined = MOTION_PRESETS[partPresetId]

    // Keyframes: use the part-specific preset if one was given; otherwise cascade the
    // block-level preset's keyframes (the "every part gets the block's choreography
    // unless it opts out" rule).
    const keyframes: MotionKeyframes = partPreset
      ? { ...partPreset.keyframes }
      : blockPreset
        ? { ...blockPreset.keyframes }
        : { opacity: [0, 1] }

    // Timing: part overrides take priority, then block-level ease, then preset defaults.
    const partDuration =
      partOverride?.duration !== undefined
        ? resolveDuration(partOverride.duration, blockDuration)
        : partPreset
          ? DURATION_TOKENS[partPreset.duration]
          : blockDuration

    const partEasing =
      partOverride?.ease !== undefined
        ? resolveEasing(partOverride.ease, blockEasing)
        : blockEasing || (partPreset ? EASING_TOKENS[partPreset.easing] : 'cubic-bezier(0.22, 1, 0.36, 1)')

    // Base delay from the spec, plus stagger offset for parts after the first.
    const baseDelay =
      partOverride?.delay !== undefined
        ? resolveDuration(partOverride.delay, 0)
        : resolveDuration(specMotion?.delay, 0)

    const delayMs = baseDelay + (index > 0 ? staggerMs * index : 0)

    const isAmbient = partPreset?.isAmbient ?? false

    return {
      partName,
      keyframes,
      durationMs: partDuration,
      delayMs,
      easing: partEasing,
      isAmbient,
      presetId: partPresetId,
    }
  })
}

// --- ShapeAnimation derivation (for blockToShape) ------------------------------------------------

/**
 * Derive a `ShapeAnimation` from a block's motion spec and definition, for use by
 * `blockToShape`. Returns `undefined` when no animation is needed (no order or preset
 * specified, or the resolved effect is `null`).
 *
 * This replaces the inline derivation in `blockToShape` so the effect mapping lives in
 * one place (the motion module) rather than being hard-coded to `FadeIn`.
 */
export function deriveShapeAnimation(
  specMotion: BlockMotionSpec | undefined,
  definitionMotion: MotionRecipe
): ShapeAnimation | undefined {
  if (!specMotion || (specMotion.order === undefined && specMotion.preset === undefined)) {
    return undefined
  }

  const resolved = resolveBlockMotion(specMotion, definitionMotion)
  if (resolved.effect === null) return undefined

  return {
    effect: resolved.effect,
    trigger: resolved.trigger,
    order: resolved.order,
    durationMs: resolvedDurationMs(resolved),
    delayMs: resolved.delayMs,
  }
}

function resolvedDurationMs(resolved: ResolvedBlockMotion): number {
  return resolved.durationMs
}
