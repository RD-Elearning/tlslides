/**
 * B7 — clone a BlockSpec tree with fresh ids, deep enough to escape the validator's
 * duplicate-id check (seenBlockIds). Only `id` fields are regenerated; `type` and
 * every other key is preserved verbatim.
 *
 * The walker recurses through:
 *  - `spec.props.children` — array of BlockSpec
 *  - `spec.children`       — array of BlockSpec (top-level)
 *  - `spec.props.<any>.id` — any nested `id` key inside a child spec's props
 *
 * Everything is cloned via JSON round-trip so the caller never gets a reference
 * to the original (the example is shared module state).
 *
 * Pure + DOM-free: no `document`, `window`, `Date.now()`. `Utils.uniqueId` is
 * used for the new ids (it is deterministic in tests: a module-level counter).
 */

import { Utils } from '@tlslides/core'
import type { BlockSpec } from './types'

/** Generate a fresh, unique id. */
function freshId(): string {
  return Utils.uniqueId('block')
}

/**
 * Regenerate every `id` in a BlockSpec tree, returning a deep clone.
 *
 * Walks `spec.id`, `spec.children` (each a BlockSpec), and any `id` key found
 * inside `spec.props` (which may itself contain nested `children` arrays or
 * block-shaped objects). Non-`id` data is preserved by reference-free JSON copy.
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

/**
 * Walk an arbitrary props object, regenerating every `id` field in place on the
 * clone. Recurses into arrays and nested objects, and treats any object with
 * `type` + `props` as a nested BlockSpec (so `tls.l.row`'s `children` slot,
 * etc., get their ids refreshed too).
 */
function clonePropsWithFreshIds(obj: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id' && typeof value === 'string') {
      obj[key] = freshId()
      continue
    }

    if (Array.isArray(value)) {
      obj[key] = value.map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return clonePropsWithFreshIds(item as Record<string, unknown>)
        }
        return item
      })
    } else if (value && typeof value === 'object') {
      obj[key] = clonePropsWithFreshIds(value as Record<string, unknown>)
    }
    // primitives are copied by JSON round-trip already
  }
  return obj
}
