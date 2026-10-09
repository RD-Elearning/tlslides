import { Utils } from '@tlslides/core'
import type { ComponentShape, ShapeAnimation } from '~types'
import { TDShapeType as TDShapeTypeEnum, AnimationEffect, AnimationTrigger } from '~types'
import { defaultStyle } from '~state/shapes/shared'
import type { BlockAnchor, BlockLayer, BlockSpec, BlockStyleSpec, BlockMotionSpec, EaseToken, MotionRecipe, Box } from './types'
import { deriveShapeAnimation, resolveBlockMotion } from './motion/resolve-motion'

/**
 * Reserved key under ComponentShape.props where block metadata is stored.
 * Block schema cannot declare a slot with this name (validation happens at registry time).
 */
export const BLOCK_PROP_KEY = '$block'

/**
 * Options for converting a BlockSpec to a ComponentShape.
 */
export interface BlockToShapeOptions {
  /** Shape id. Defaults to `Utils.uniqueId()` for each call. */
  id?: string
  /** Parent page id. Defaults to `'page'`. */
  parentId?: string
  /** Z-order index within the parent. Defaults to `1`. */
  childIndex?: number
  /** The block definition's default motion recipe. When provided, `deriveShapeAnimation` resolves
   *  the block-level animation from the spec's motion + this definition default, instead of
   *  falling back to a hardcoded FadeIn. Carried by `compileSlide` (which has a registry) so the
   *  persisted `ShapeAnimation` reflects the real preset rather than Phase 18's placeholder. */
  definitionMotion?: MotionRecipe
}

/**
 * Metadata stored under the `$block` key in a ComponentShape's props.
 */
interface BlockMetadata {
  id?: string
  style?: BlockStyleSpec
  motion?: BlockMotionSpec
  children?: BlockSpec[]
  /** LO2 — the instance's explicit paint layer (`BlockSpec.layer`). */
  layer?: BlockLayer
  /** LO2.1 — `BlockSpec.anchor` / `BlockSpec.anchorTo`. */
  anchor?: BlockAnchor
  anchorTo?: string
  /** P7 — motion derived from the slide's `motionStyle` by `compileSlide`. Never authored, never
   *  returned by `shapeToBlock`; playback reads it through `shapeToRevealBlock`. */
  styleMotion?: BlockMotionSpec
  /** P7 — the style that produced `styleMotion` (drives `BlockMotionRuntime.style`). */
  motionStyle?: 'subtle' | 'expressive'
  /** LO8 — where `compileSlide` placed a layered (backdrop/overlay) block: its box, and whether
   *  it came from a region (anchored) or from `free[]`. Never authored, never returned by
   *  `shapeToBlock`: the decompiler compares it with the shape's box to tell "the user moved it"
   *  (keep the move, `free[]`) from "untouched" (re-anchor). */
  placed?: ShapePlacement
  /** AC1 — the deck style's knob defaults `compileSlide` filled into the top-level props (keys the
   *  block did not author). Never authored: `shapeToBlock` drops a filled key whose value is still
   *  the default, so the round trip returns the authored props. */
  styleDefaults?: Record<string, unknown>
}

/** LO8 — see `BlockMetadata.placed`. */
export interface ShapePlacement {
  box: Box
  from: 'region' | 'free'
}

/** LO8 — where the compiler placed a layered block (`$block.placed`), if recorded. */
export function shapePlacement(shape: unknown): ShapePlacement | undefined {
  const meta = (shape as { props?: Record<string, unknown> } | null)?.props?.[BLOCK_PROP_KEY] as BlockMetadata | undefined
  const p = meta?.placed
  const b = p?.box
  if (!p || !b || typeof b !== 'object' || (p.from !== 'region' && p.from !== 'free')) return undefined
  const ok = [b.x, b.y, b.width, b.height].every((n) => typeof n === 'number' && Number.isFinite(n))
  return ok ? { box: { x: b.x, y: b.y, width: b.width, height: b.height }, from: p.from } : undefined
}

/**
 * Convert a BlockSpec to a ComponentShape.
 *
 * Layout: `componentId` is `spec.type`; `spec.props` spreads at the top level of the
 * shape's `props`; everything else (`id`, `style`, `motion`, `children`) goes under
 * the single reserved key `$block`. The shape's `slot` is copied from `spec.slot`.
 *
 * Animation: when `spec.motion` has `order` or `preset`, derive a `ShapeAnimation` for
 * the block-level reveal. Otherwise leave `animation` undefined.
 *
 * @param spec The block instance to convert.
 * @param box The box [x, y, width, height] where this block sits on the slide.
 * @param opts Shape identity options (id, parentId, childIndex).
 * @returns A ComponentShape ready to insert via `Commands.insertContent`.
 * @throws Error if any prop is literally named `$block` (a reserved key).
 */
export function blockToShape(
  spec: BlockSpec,
  box: Box,
  opts?: BlockToShapeOptions
): ComponentShape {
  // Deep clone spec.props so mutations don't affect the original.
  // Uses JSON round-trip for guaranteed deep cloning (works for serializable data).
  // Note: This drops any props whose value is explicitly `undefined`, which differs
  // from the repo's usual `Utils.deepMerge` behaviour. This is acceptable for
  // serializable block props, but documented here as an intentional choice.
  const clonedProps: Record<string, unknown> = JSON.parse(JSON.stringify(spec.props))

  // Guard: reject any prop literally named $block (a reserved key for metadata)
  if (BLOCK_PROP_KEY in clonedProps) {
    throw new Error(
      `blockToShape: spec.props contains a key "$block", which is reserved for internal metadata. ` +
        `Rename this property or store it inside another object.`
    )
  }

  // Package the block metadata
  const metadata: BlockMetadata = {}
  if (spec.id !== undefined) {
    metadata.id = spec.id
  }
  if (spec.style !== undefined) {
    metadata.style = JSON.parse(JSON.stringify(spec.style))
  }
  if (spec.motion !== undefined) {
    metadata.motion = JSON.parse(JSON.stringify(spec.motion))
  }
  if (spec.children !== undefined) {
    metadata.children = JSON.parse(JSON.stringify(spec.children))
  }
  if (spec.layer !== undefined) {
    metadata.layer = spec.layer
  }
  if (spec.anchor !== undefined) metadata.anchor = spec.anchor
  if (spec.anchorTo !== undefined) metadata.anchorTo = spec.anchorTo

  // Store metadata under the reserved key
  clonedProps[BLOCK_PROP_KEY] = metadata

  // Derive animation from motion if present.
  // When a block definition's motion recipe is provided (via opts), use it as the
  // fallback for preset resolution — this gives the real effect (FadeIn, SlideIn, etc.)
  // instead of the Phase 18 hardcoded FadeIn. Without a definition, resolve purely from
  // the spec's own fields (preset → effect mapping lives in resolve-motion.ts).
  let animation: ShapeAnimation | undefined = undefined
  const defMotion = opts?.definitionMotion
  if (defMotion) {
    // Full resolution path: spec → definition → default preset.
    animation = deriveShapeAnimation(spec.motion, defMotion)
  } else if (spec.motion && (spec.motion.order !== undefined || spec.motion.preset !== undefined)) {
    // Fallback: resolve from spec alone (no definition available). The effect mapping
    // uses presetToEffect directly — the same four effects as the Phase 18 path.
    const resolved = resolveBlockMotion(spec.motion, {})
    if (resolved.effect !== null) {
      animation = {
        effect: resolved.effect,
        trigger: resolved.trigger,
        order: resolved.order,
        durationMs: resolved.durationMs,
        delayMs: resolved.delayMs,
        easing: resolved.easing,
      }
    }
  }

  // Build the ComponentShape with proper defaults
  const shape: ComponentShape = {
    id: opts?.id ?? Utils.uniqueId(),
    type: TDShapeTypeEnum.Component,
    name: spec.type,
    parentId: opts?.parentId ?? 'page',
    childIndex: opts?.childIndex ?? 1,
    point: [box.x, box.y],
    size: [box.width, box.height],
    rotation: 0,
    // Copied, never assigned by reference: `defaultStyle` is a module-level singleton, so
    // `style: defaultStyle` would hand every block in the process the *same* object — one
    // `shape.style.color = ...` would then silently restyle every other block and corrupt the
    // shared default itself. This repo has already paid for that exact bug once, with
    // DEFAULT_SLIDE_SIZE in Phase 3. Covered by a `not.toBe` test, which is the only kind of
    // assertion that catches it (a `toEqual` passes happily while aliasing).
    style: { ...defaultStyle },
    componentId: spec.type,
    props: clonedProps,
    slot: spec.slot,
    animation,
  }

  return shape
}

/**
 * Convert a ComponentShape back to a BlockSpec.
 *
 * Inverse of `blockToShape`: lift the block metadata from under the `$block` key
 * and reassemble it as a BlockSpec. Returns undefined if the shape is not a block
 * (i.e., it is not a ComponentShape, or has no `$block` metadata).
 *
 * @param shape The shape to convert (accepts any shape, guards at runtime).
 * @returns The BlockSpec, or undefined if this is not a block.
 */
export function shapeToBlock(shape: unknown): BlockSpec | undefined {
  // Type guard: check if shape is an object with required properties
  if (!shape || typeof shape !== 'object') {
    return undefined
  }

  const shapeObj = shape as Record<string, unknown>

  // Guard: only process ComponentShape types
  if (shapeObj.type !== TDShapeTypeEnum.Component) {
    return undefined
  }

  const metadata = (shapeObj.props as Record<string, unknown>)?.[BLOCK_PROP_KEY]
  if (!metadata || typeof metadata !== 'object') {
    return undefined
  }

  const meta = metadata as BlockMetadata
  const props = shapeObj.props as Record<string, unknown>

  // Deep clone props, excluding the metadata key.
  // Uses JSON round-trip for consistency with blockToShape.
  const clonedProps: Record<string, unknown> = {}
  const styleDefaults = meta.styleDefaults && typeof meta.styleDefaults === 'object' ? meta.styleDefaults : undefined
  for (const [key, value] of Object.entries(props)) {
    if (key !== BLOCK_PROP_KEY) {
      // AC1: a style-filled knob still at its default was never authored.
      if (styleDefaults && key in styleDefaults && JSON.stringify(styleDefaults[key]) === JSON.stringify(value)) continue
      clonedProps[key] = JSON.parse(JSON.stringify(value))
    }
  }

  // Reassemble the BlockSpec. Schema v1 requires `id`; a shape from before this field
  // existed (or one authored by hand) simply has no `$block.id` — mint one rather than
  // throwing, per `reviews/blocks/BACKLOG-demo.md` §2.2's note on `BlockSpec.id`.
  const spec: BlockSpec = {
    id: meta.id ?? Utils.uniqueId(),
    type: shapeObj.componentId as string,
    props: clonedProps,
  }

  if (meta.style !== undefined) {
    spec.style = JSON.parse(JSON.stringify(meta.style))
  }
  if (meta.motion !== undefined) {
    spec.motion = JSON.parse(JSON.stringify(meta.motion))
  }
  // The persisted `ShapeAnimation` is the actual source of truth for playback — and the field a
  // future inspector (R12) writes into directly, independently of `meta.motion`. Fold it into
  // `spec.motion` when it has *diverged* from what `meta.motion` alone implies, so playback can
  // never silently ignore a persisted delay/duration/effect/easing edit. When it has not diverged
  // (the common case), `spec.motion` is returned verbatim and the DeckSpec round-trip stays
  // lossless.
  const animation = shapeObj.animation as ShapeAnimation | undefined
  if (animation) {
    // P7: a style-derived animation is implied by `$block.styleMotion`, not a divergence.
    const implied = resolveBlockMotion(spec.motion ?? meta.styleMotion ?? {}, {})
    const diverged =
      animation.effect !== implied.effect ||
      animation.trigger !== implied.trigger ||
      animation.order !== implied.order ||
      animation.durationMs !== implied.durationMs ||
      animation.delayMs !== implied.delayMs ||
      (animation.easing !== undefined && animation.easing !== implied.easing)
    if (diverged) {
      spec.motion = {
        ...(spec.motion ?? {}),
        effect: animation.effect,
        trigger: animation.trigger,
        order: animation.order,
        duration: animation.durationMs,
        delay: animation.delayMs,
        // `easing` is an arbitrary CSS string; `ease` is the narrow token union but
        // `resolveEasing` passes any non-token string through unchanged.
        ...(animation.easing !== undefined ? { ease: animation.easing as EaseToken } : {}),
      }
    }
  }
  if (meta.children !== undefined) {
    spec.children = JSON.parse(JSON.stringify(meta.children))
  }
  if (meta.layer !== undefined) {
    spec.layer = meta.layer
  }
  if (meta.anchor !== undefined) spec.anchor = meta.anchor
  if (meta.anchorTo !== undefined) spec.anchorTo = meta.anchorTo
  if (shapeObj.slot !== undefined) {
    spec.slot = shapeObj.slot as string
  }

  return spec
}

/**
 * P7 — the block spec playback should use: `shapeToBlock`, plus the style-derived motion as
 * `motion` when the block has none of its own. Only for reveal code (DeckViewer,
 * PresentationRuntime); never persist its result.
 */
export function shapeToRevealBlock(shape: unknown): BlockSpec | undefined {
  const spec = shapeToBlock(shape)
  if (!spec || spec.motion !== undefined) return spec
  const meta = blockMetaOf(shape)
  if (meta?.styleMotion) spec.motion = JSON.parse(JSON.stringify(meta.styleMotion))
  return spec
}

/**
 * P7 — the motion style an html block's `animate()` should honour (`BlockMotionRuntime.style`):
 * `'subtle'` only when the compiler derived the block's motion from a subtle slide; otherwise
 * `'expressive'` (the pre-P7 behaviour, also used for explicit block `motion`).
 */
export function revealStyleOf(shape: unknown): 'subtle' | 'expressive' {
  return blockMetaOf(shape)?.motionStyle === 'subtle' ? 'subtle' : 'expressive'
}

function blockMetaOf(shape: unknown): BlockMetadata | undefined {
  if (!shape || typeof shape !== 'object') return undefined
  const props = (shape as Record<string, unknown>).props as Record<string, unknown> | undefined
  const meta = props?.[BLOCK_PROP_KEY]
  return meta && typeof meta === 'object' ? (meta as BlockMetadata) : undefined
}
