/**
 * Linear scale with "nice" tick selection (1/2/5 × 10ⁿ).
 *
 * Pure functions, no DOM, no block dependency. Used by the shared chart engine
 * (04 §4.8) so every data block agrees on axis geometry.
 */

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Linear scale                                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * A linear scale maps a continuous domain to a continuous range.
 */
export interface LinearScale {
  /** Map a domain value to a range value. */
  (value: number): number
  /** The input domain [min, max]. */
  domain: [number, number]
  /** The output range [min, max]. */
  range: [number, number]
  /** The inverse: map a range value back to a domain value. */
  invert(value: number): number
}

/**
 * Build a linear scale from a domain and range.
 *
 * Clamps output to the range boundary, so values outside [domainMin, domainMax]
 * are clamped rather than extrapolated — chart bars should not overshoot the axis.
 */
export function linearScale(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const domainSpan = d1 - d0
  const rangeSpan = r1 - r0

  const scale = (value: number): number => {
    if (domainSpan === 0) return r0
    const t = (value - d0) / domainSpan
    // Clamp to range
    const clamped = Math.max(0, Math.min(1, t))
    return r0 + clamped * rangeSpan
  }

  scale.domain = domain
  scale.range = range
  scale.invert = (value: number): number => {
    if (rangeSpan === 0) return d0
    const t = (value - r0) / rangeSpan
    return d0 + t * domainSpan
  }

  return scale
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Nice numbers (1/2/5 × 10ⁿ)                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Compute a "nice" number that the axis label closest to `value` can snap to.
 * Uses the 1/2/5 × 10ⁿ progression standard in chart libraries.
 *
 * @param value - The raw value to "nice-ify"
 * @param round - If true, round down to the nice number; if false, ceil (for range extent)
 */
export function niceNumber(value: number, round: boolean): number {
  const exp = Math.floor(Math.log10(Math.abs(value) || 1))
  const frac = (Math.abs(value) || 1) / Math.pow(10, exp)
  let nice: number
  if (frac < 1.5) nice = 1
  else if (frac < 3) nice = 2
  else if (frac < 7) nice = 5
  else nice = 10
  nice *= Math.pow(10, exp)
  return round ? Math.floor(nice) * Math.sign(value || 1) : Math.ceil(nice) * Math.sign(value || 1)
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Tick generation                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Ticks for an axis.
 */
export interface AxisTicks {
  /** The tick values (ascending). */
  values: number[]
  /** Number of target ticks (hint for the algorithm). */
  count: number
}

/**
 * Generate "nice" axis ticks for a linear scale.
 *
 * Algorithm: compute a nice step size via `niceNumber`, then snap the domain
 * endpoints to multiples of that step so the first and last tick land exactly
 * on the domain edges.
 *
 * @param domain - [min, max] of the data
 * @param maxTicks - maximum number of ticks to generate (default 8)
 * @returns sorted array of tick values, always including 0 if the domain spans it
 */
export function niceTicks(domain: [number, number], maxTicks = 8): number[] {
  const [dMin, dMax] = domain
  const range = dMax - dMin
  if (range === 0) return [dMin]
  if (maxTicks < 1) maxTicks = 1

  // Target step size
  const rawStep = range / (maxTicks - 1 || 1)
  const step = niceNumber(rawStep, false)

  // Nice domain extent
  const niceMin = Math.floor(dMin / step) * step
  const niceMax = Math.ceil(dMax / step) * step

  // Generate ticks
  const ticks: number[] = []
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    // Round to avoid floating-point dust
    const rounded = Math.round(v * 1e10) / 1e10
    if (rounded >= dMin - step * 0.5 && rounded <= dMax + step * 0.5) {
      ticks.push(rounded)
    }
  }

  // Deduplicate (can happen near zero)
  const unique: number[] = []
  for (const t of ticks) {
    if (unique.length === 0 || Math.abs(t - unique[unique.length - 1]) > step * 1e-6) {
      unique.push(t)
    }
  }

  return unique
}

/**
 * Compute the optimal domain for a bar chart where baseline is always zero.
 * Returns [0, max] where max is the nice upper bound.
 */
export function barDomain(values: number[]): [number, number] {
  // Filter out NaN/null for computing domain extent, but the caller handles display
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length === 0) return [0, 1]
  const maxAbs = Math.max(...finite.map(Math.abs))
  // Nice upper bound — use niceNumber to round up
  const nice = niceNumber(maxAbs, false)
  return [0, Math.max(nice, 0)]
}
