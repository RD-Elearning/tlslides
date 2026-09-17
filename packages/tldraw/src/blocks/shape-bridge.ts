import { Utils } from '@tlslides/core'
import type { ComponentShape, ShapeAnimation } from '~types'
import { TDShapeType as TDShapeTypeEnum, AnimationEffect, AnimationTrigger } from '~types'
import { defaultStyle } from '~state/shapes/shared'
import type { BlockSpec, BlockStyleSpec, BlockMotionSpec, Box } from './types'

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
}

/**
 * Metadata stored under the `$block` key in a ComponentShape's props.
 */
interface BlockMetadata {
  id?: string
  style?: BlockStyleSpec
  motion?: BlockMotionSpec
  children?: BlockSpec[]
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

  // Store metadata under the reserved key
  clonedProps[BLOCK_PROP_KEY] = metadata

  // Derive animation from motion if present
  let animation: ShapeAnimation | undefined = undefined
  if (spec.motion && (spec.motion.order !== undefined || spec.motion.preset !== undefined)) {
    animation = {
      effect: AnimationEffect.FadeIn, // Phase 18 default; Phase 22 will expand this
      trigger: spec.motion.trigger ?? AnimationTrigger.WithPrevious,
      order: spec.motion.order ?? 0,
      durationMs: typeof spec.motion.duration === 'number' ? spec.motion.duration : 400,
      delayMs: typeof spec.motion.delay === 'number' ? spec.motion.delay : 0,
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
  for (const [key, value] of Object.entries(props)) {
    if (key !== BLOCK_PROP_KEY) {
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
  if (meta.children !== undefined) {
    spec.children = JSON.parse(JSON.stringify(meta.children))
  }
  if (shapeObj.slot !== undefined) {
    spec.slot = shapeObj.slot as string
  }

  return spec
}
