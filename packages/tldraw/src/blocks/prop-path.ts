/**
 * Property path utilities for inline editing.
 *
 * A propPath is a dot-separated path into a props object, e.g.:
 * - "text" → props.text
 * - "items.2.text" → props.items[2].text
 * - "cells.0.title" → props.cells[0].title
 *
 * These are set by layout functions on text LayoutNodes and read by the
 * editor's inline editing overlay to know which prop to update.
 */

/** Parse a dot-separated path into an array of keys. Handles array indices. */
export function parsePropPath(path: string): (string | number)[] {
  return path.split('.').map((key) => {
    const num = Number(key)
    return Number.isNaN(num) ? key : num
  })
}

/** Set a value at a dot-separated path in an object, returning a new object. */
export function setAtPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = parsePropPath(path)

  if (keys.length === 0) {
    return { ...obj, ...value as Record<string, unknown> }
  }

  // Build the new object with the value set at the path
  const result = { ...obj }
  let current: Record<string, unknown> = result

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]
    const currentValue = current[key]

    // If the next key is a number, we're in an array
    if (typeof nextKey === 'number') {
      // Ensure current[key] is an array
      if (!Array.isArray(currentValue)) {
        current[key] = []
      }
      // Initialize the array element if needed
      if (!(currentValue instanceof Array) || !(nextKey in currentValue)) {
        current[key] = []
      }
      current = current[key] as Record<string, unknown>
    } else {
      // Ensure current[key] is an object
      if (typeof currentValue !== 'object' || currentValue === null || Array.isArray(currentValue)) {
        current[key] = {}
      }
      current = current[key] as Record<string, unknown>
    }
  }

  // Set the final value
  const finalKey = keys[keys.length - 1]
  if (typeof finalKey === 'number') {
    // We're setting an array element
    const parent = current
    if (!Array.isArray(parent)) {
      // This shouldn't happen if the path is well-formed
      return result
    }
    parent[finalKey] = value
  } else {
    current[finalKey] = value
  }

  return result
}

/** Get a value at a dot-separated path in an object. Returns undefined if not found. */
export function getAtPath(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const keys = parsePropPath(path)
  let current: unknown = obj

  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }

  return current
}

/** Deep clone an object to ensure no shared references. */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}