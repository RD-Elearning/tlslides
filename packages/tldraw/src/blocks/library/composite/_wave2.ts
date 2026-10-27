/**
 * spro creative CR13 — small guards shared by the wave-2/3 composites: hostile props (a number
 * where a list belongs, nulls in a list) become empty values, never a crash.
 */

/** The plain objects of a list prop, at most `max`. */
export function objects<T extends Record<string, unknown>>(v: unknown, max: number): T[] {
  return (Array.isArray(v) ? v : []).filter((x): x is T => !!x && typeof x === 'object' && !Array.isArray(x)).slice(0, max)
}

/** A text prop as a string ('' for anything that is not text or a number). */
export function text(v: unknown, max = 400): string {
  return typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : ''
}
