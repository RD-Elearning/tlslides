/**
 * Multi-series helpers: y-domain with stacking, and categorical band positions.
 *
 * Slot convention (no new SlotType): `series: list<object{ name: text, values: list<number> }>`
 * plus `categories: list<text>`; at most MAX_HUES (6) series. Pure functions.
 */

export type StackMode = 'grouped' | 'stacked' | 'percent'

export interface SeriesLike {
  values: ReadonlyArray<number | null | undefined>
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * y-domain `[min, max]` that always includes zero (zero baseline for bars).
 * - grouped: extremes of every value.
 * - stacked: per category, positives stack up and negatives stack down separately.
 * - percent: `[0, 100]` (each category is normalised to 100).
 * No data gives `[0, 1]`. Missing / non-finite values are skipped.
 */
export function multiSeriesDomain(series: ReadonlyArray<SeriesLike>, mode: StackMode = 'grouped'): [number, number] {
  if (mode === 'percent') return [0, 100]
  let min = 0
  let max = 0
  let any = false
  if (mode === 'grouped') {
    for (const s of series) {
      for (const v of s.values) {
        if (!finite(v)) continue
        any = true
        if (v < min) min = v
        if (v > max) max = v
      }
    }
  } else {
    const len = Math.max(0, ...series.map((s) => s.values.length))
    for (let c = 0; c < len; c++) {
      let pos = 0
      let neg = 0
      for (const s of series) {
        const v = s.values[c]
        if (!finite(v)) continue
        any = true
        if (v >= 0) pos += v
        else neg += v
      }
      if (pos > max) max = pos
      if (neg < min) min = neg
    }
  }
  if (!any || (min === 0 && max === 0)) return [0, 1]
  return [min, max]
}

export interface BandScale {
  /** Distance between the starts of adjacent bands. */
  step: number
  /** Width of one band after padding. */
  bandwidth: number
  /** Start x of band `i`. */
  start(i: number): number
  /** Centre x of band `i`. */
  center(i: number): number
  /** Start of every band. */
  starts: number[]
}

/**
 * Evenly spaced bands across an ascending `range`. `padding` is the fraction (0..1) of each step
 * left empty, split half on each side of the band, so the first band does not touch the axis.
 */
export function bandScale(categories: ReadonlyArray<unknown>, range: [number, number], padding = 0.2): BandScale {
  const count = categories.length
  const span = Math.max(0, range[1] - range[0])
  const step = count === 0 ? 0 : span / count
  const pad = Math.min(1, Math.max(0, padding))
  const bandwidth = step * (1 - pad)
  const offset = (step - bandwidth) / 2
  const start = (i: number) => range[0] + i * step + offset
  return {
    step,
    bandwidth,
    start,
    center: (i) => start(i) + bandwidth / 2,
    starts: categories.map((_, i) => start(i)),
  }
}
