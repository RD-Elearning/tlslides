/**
 * B7 — clone a BlockSpec tree with fresh ids, deep enough to escape the validator's
 * duplicate-id check (seenBlockIds). Only `id` fields are regenerated; `type` and
 * every other key is preserved verbatim.
 *
 * The walker recurses through:
 *  - `spec.props.children` — array of BlockSpec
 *  - `spec.children`       — array of BlockSpec (top-level)
 *  - any BlockSpec nested inside `spec.props` (an object with a string `type` and a
 *    `props` object, e.g. a container's `props.children`)
 *
 * S20: an `id` on any other object inside props (a `tls.g.flow` node, which its edges'
 * `from` / `to` refer to) is data that only needs to be unique within its block, so it is
 * kept verbatim: regenerating it broke every reference to it.
 *
 * Everything is cloned via JSON round-trip so the caller never gets a reference
 * to the original (the example is shared module state).
 *
 * Pure + DOM-free: no `document`, `window`, `Date.now()`. `Utils.uniqueId()` (a
 * random UUID-shaped string) is used for the new ids.
 */

import { Utils } from '@tlslides/core'
import type { BlockSpec } from './types'

/**
 * Generate a fresh, unique id. `Utils.uniqueId(arg)` with an argument is its internal
 * one-hex-digit helper (`uniqueId('block')` gave ids like "7", so siblings collided): call it bare.
 */
function freshId(): string {
  return 'b_' + Utils.uniqueId()
}

/**
 * Regenerate every `id` in a BlockSpec tree, returning a deep clone.
 *
 * Walks `spec.id`, `spec.children` (each a BlockSpec), and every BlockSpec nested
 * inside `spec.props` (e.g. `children` arrays). Everything else, including the `id`
 * of a plain data object in props, is preserved by reference-free JSON copy.
 */
export function cloneSpecWithFreshIds(spec: BlockSpec): BlockSpec {
  // Start from a full JSON deep-clone so the original example object is never
  // touched. (The example is shared module state; a mutation here would leak
  // into the gallery for subsequent renders.)
  const clone: BlockSpec = JSON.parse(JSON.stringify(spec))

  clone.id = freshId()

  // Recurse into top-level children (container blocks carry them here).
  if (Array.isArray(clone.children)) {
    clone.children = clone.children.map(cloneSpecWithFreshIds)
  }

  // Walk props for any `id` key or nested block-shaped children.
  if (clone.props && typeof clone.props === 'object') {
    clone.props = clonePropsWithFreshIds(clone.props as Record<string, unknown>)
  }

  return clone
}

/** A nested BlockSpec: a string `type` plus a `props` object (a container's child). */
function isBlockSpec(value: Record<string, unknown>): boolean {
  return typeof value.type === 'string' && !!value.props && typeof value.props === 'object' && !Array.isArray(value.props)
}

/** Clone one value found inside props: a nested BlockSpec gets fresh ids, anything else is walked. */
function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return isBlockSpec(obj) ? cloneSpecWithFreshIds(obj as unknown as BlockSpec) : clonePropsWithFreshIds(obj)
  }
  return value // primitives are copied by the JSON round-trip already
}

/**
 * Walk an arbitrary props object on the clone. Only nested BlockSpecs (so `tls.l.row`'s
 * `children` slot, etc.) get fresh ids; a plain data object keeps its `id`, because other
 * props may refer to it (S20: `tls.g.flow` edges name their nodes by id).
 */
function clonePropsWithFreshIds(obj: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) obj[key] = cloneValue(value)
  return obj
}
