/**
 * Series color assignment for data charts.
 *
 * ≤6 hues from `tokens.categorical`. A single series uses `accent`, not
 * `categorical[0]` — so every one-series chart in a deck agrees (04 §4.8).
 *
 * Pure functions, no DOM, no block dependency.
 */

import type { ResolvedTokens } from '../../../types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Color assignment                                                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Maximum number of distinct hues before grouping the tail as "Other". */
export const MAX_HUES = 6

/**
 * Assign colors to chart series.
 *
 * Rules (04 §4.8):
 * - **Single series** → `tokens.color.accent` (NOT `categorical[0]`).
 * - **2–6 series** → `tokens.categorical[0..N-1]` in order.
 * - **>6 series** → first 5 + "Other" grouping (caller handles grouping).
 *
 * @param seriesCount - Number of data series
 * @param tokens - Resolved design tokens
 * @returns Array of hex colors, one per series. Length ≤ MAX_HUES.
 */
export function assignSeriesColors(seriesCount: number, tokens: ResolvedTokens): string[] {
  if (seriesCount <= 0) return []

  // Single series: always use accent — never categorical[0]
  if (seriesCount === 1) {
    return [tokens.color.accent]
  }

  // Multiple series: use categorical ramp, capped at MAX_HUES
  const count = Math.min(seriesCount, MAX_HUES)
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    colors.push(tokens.categorical[i % tokens.categorical.length])
  }
  return colors
}

/**
 * For a highlighted bar, return the accent color; for all others, return a muted tone.
 * Used when `highlightIndex` is set — recolors the highlighted mark to `accent`
 * and pushes the rest to `neutral`.
 *
 * @param index - The bar index
 * @param highlightIndex - Which bar to highlight
 * @param baseColor - The series color for this bar
 * @param tokens - Resolved design tokens
 * @returns The final color hex string
 */
export function highlightColor(
  index: number,
  highlightIndex: number,
  baseColor: string,
  tokens: ResolvedTokens
): string {
  if (index === highlightIndex) {
    return tokens.color.accent
  }
  // Non-highlighted bars use a muted neutral tone
  return tokens.color.neutral
}
