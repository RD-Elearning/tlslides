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
  if (typeof v === 'number') return String(v)
  if (typeof v !== 'string') return ''
  if (v.length <= max) return v
  // review 2026-11-08 (memphis s9 "They got con", "— then ch"): a text past its cap is cut at a word
  // boundary and ends in an ellipsis — never in the middle of a word with nothing to show the cut
  const head = v.slice(0, Math.max(1, max - 1))
  const space = head.lastIndexOf(' ')
  return `${(space >= max * 0.6 ? head.slice(0, space) : head).trimEnd()}…`
}
