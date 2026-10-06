/**
 * Clip-path keyframe pairing (M1 / S16).
 *
 * GSAP tweens a clip-path as a string: it pairs the numbers of the start and end values in
 * order and keeps the end value's units. `inset(0 100% 0 0)` → `inset(0)` therefore has one
 * number to interpolate instead of four, and `inset(0 100% 0 0)` → `inset(0 0 0 0)` mixes `%`
 * with unitless zeros; in both cases the element sits still and snaps on the first or last frame.
 * `pairClipPath` rewrites both ends of an `inset()` pair to four explicit terms with matching
 * units, which every interpolator handles. Other shapes (`circle()`, `polygon()`) pass through.
 *
 * Pure: no DOM.
 */

const INSET = /^\s*inset\(\s*([^)]*?)\s*\)\s*$/

/** The four `inset()` terms (top right bottom left), or `undefined` for anything else (or an
 *  inset with `round`, which is left alone). */
function insetTerms(value: string): string[] | undefined {
  const m = INSET.exec(value)
  if (!m || /\bround\b/.test(m[1])) return undefined
  const t = m[1].split(/\s+/).filter(Boolean)
  if (t.length === 0 || t.length > 4) return undefined
  const top = t[0]
  const right = t[1] ?? top
  const bottom = t[2] ?? top
  const left = t[3] ?? right
  return [top, right, bottom, left]
}

const unitOf = (term: string): string => term.replace(/^-?[\d.]+/, '')
const isBareZero = (term: string): boolean => /^-?0*\.?0+$/.test(term)

/** One clip-path value with its `inset()` written out as four `%`-unit terms where a term is a
 *  bare zero (`inset(0)` → `inset(0% 0% 0% 0%)`). */
export function normalizeClipPath(value: string): string {
  const t = insetTerms(value)
  if (!t) return value
  return `inset(${t.map((x) => (isBareZero(x) ? '0%' : x)).join(' ')})`
}

/** Both ends of a clip-path tween, rewritten so each `inset()` term has a partner with the same
 *  unit. A pair that is not two insets is returned unchanged. */
export function pairClipPath(from: string, to: string): [string, string] {
  const a = insetTerms(from)
  const b = insetTerms(to)
  if (!a || !b) return [from, to]
  const outA: string[] = []
  const outB: string[] = []
  for (let i = 0; i < 4; i++) {
    let x = a[i]
    let y = b[i]
    if (isBareZero(x)) x = `0${isBareZero(y) ? '%' : unitOf(y) || '%'}`
    if (isBareZero(y)) y = `0${unitOf(x) || '%'}`
    outA.push(x)
    outB.push(y)
  }
  return [`inset(${outA.join(' ')})`, `inset(${outB.join(' ')})`]
}
