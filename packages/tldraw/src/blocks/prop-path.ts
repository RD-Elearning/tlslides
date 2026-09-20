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

/**
 * Set a value at a dot-separated path in an object, returning a new object.
 *
 * Every container on the path is shallow-copied before being written to, so the input
 * `obj` (and any array/object it contains) is never mutated. That matters here specifically:
 * the result is handed straight to `app.updateShapes`, whose undo stack captures a "before"
 * snapshot from the *current* shape — if this function mutated a nested array/object in
 * place, that snapshot would already reflect the new value by the time it's read, silently
 * breaking undo for any nested path (e.g. a bullet item's `items.0.text`).
 */
export function setAtPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = parsePropPath(path)

  if (keys.length === 0) {
    return { ...obj, ...value as Record<string, unknown> }
  }

  function set(container: unknown, keys: (string | number)[]): unknown {
    const [key, ...rest] = keys
    if (rest.length === 0) {
      if (typeof key === 'number') {
        const arr = Array.isArray(container) ? [...container] : []
        arr[key] = value
        return arr
      }
      const obj = typeof container === 'object' && container !== null && !Array.isArray(container)
        ? { ...(container as Record<string, unknown>) }
        : {}
      obj[key] = value
      return obj
    }

    if (typeof key === 'number') {
      const arr = Array.isArray(container) ? [...container] : []
      arr[key] = set(arr[key], rest)
      return arr
    }
    const obj = typeof container === 'object' && container !== null && !Array.isArray(container)
      ? { ...(container as Record<string, unknown>) }
      : {}
    obj[key] = set(obj[key], rest)
    return obj
  }

  return set(obj, keys) as Record<string, unknown>
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