/**
 * Autofit text: shrink font size until content fits inside a box, respecting a 0.75 floor.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 *
 * `style.scale` must multiply font size in every calculation path — this was the
 * Phase 13–15 bug where template exports silently broke because scale was ignored.
 */

import type { Box, ResolvedTextStyle } from '../types'
import type { MeasureTextProvider } from './measure'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Public API                                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Result of an autofit operation.
 */
export interface AutofitResult {
  /** The resolved style (with adjusted `size` and `scale`). */
  style: ResolvedTextStyle
  /** True if text still overflows even at the minimum scale floor. */
  overflow: boolean
}

/**
 * Autofit text: shrink font size until the measured text fits inside `box`, never
 * shrinking below `style.size * 0.75`. The effective font size is
 * `style.size * style.scale`, and both `size` and `scale` are adjusted together
 * so downstream consumers see the scaled size reflected in `style.size`.
 *
 * **`style.scale` MUST multiply font size in every calculation path.** This was
 * the exact omission that silently broke every template export from Phase 13 to 15.
 *
 * @param text   The text content (plain string or RichText).
 * @param style  The resolved text style. `style.size` is the starting font size.
 * @param box    The bounding box the text must fit inside.
 * @param provider  Text measurement provider (e.g. `estimateMetrics`).
 * @returns      The adjusted style and whether overflow persists.
 */
export function autofitText(
  text: string,
  style: ResolvedTextStyle,
  box: Box,
  provider: MeasureTextProvider,
): AutofitResult {
  const baseSize = style.size
  const scale = style.scale ?? 1
  const floorSize = baseSize * 0.75

  // Effective font size = baseSize * scale. We shrink the effective size by
  // reducing scale (keeping baseSize as the original token value).
  let currentEffectiveSize = baseSize * scale
  let currentScale = scale

  // Check if it already fits.
  const initialMetrics = provider(text, { ...style, size: currentEffectiveSize }, box.width)
  if (fitsInBox(initialMetrics.height, box.height)) {
    return { style: { ...style, size: baseSize, scale: currentScale }, overflow: false }
  }

  // Shrink by 0.5 increments on effective font size until it fits or we hit the floor.
  while (currentEffectiveSize > floorSize) {
    currentEffectiveSize = Math.max(floorSize, currentEffectiveSize - 0.5)
    // Recompute scale relative to baseSize so downstream sees a consistent ratio.
    currentScale = currentEffectiveSize / baseSize

    const metrics = provider(text, { ...style, size: currentEffectiveSize }, box.width)
    if (fitsInBox(metrics.height, box.height)) {
      return {
        style: { ...style, size: baseSize, scale: currentScale },
        overflow: false,
      }
    }
  }

  // At floor and still overflowing.
  return {
    style: { ...style, size: baseSize, scale: floorSize / baseSize },
    overflow: true,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Whether the measured text height fits inside the box height.
 * A small tolerance (0.5) accounts for rounding in the heuristic.
 */
function fitsInBox(textHeight: number, boxHeight: number): boolean {
  return textHeight <= boxHeight + 0.5
}
