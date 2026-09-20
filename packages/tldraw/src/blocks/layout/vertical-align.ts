/**
 * Vertical alignment: adjust text line baselines so the block of lines is
 * aligned to start (top), center, or end (bottom) within a given box height.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { TextLine } from '../types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Public API                                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Adjust baselines for vertical alignment. Returns a new `TextLine[]` array with
 * shifted baselines — the originals are never mutated.
 *
 * @param lines      The original text lines with baselines relative to the text
 *                   node's top-left origin.
 * @param boxHeight  The height of the containing box.
 * @param align      `'start'` (top), `'center'`, or `'end'` (bottom).
 * @returns          New TextLine array with adjusted baselines.
 */
export function alignVertically(
  lines: TextLine[],
  boxHeight: number,
  align: 'start' | 'center' | 'end',
): TextLine[] {
  if (lines.length === 0 || align === 'start') {
    // 'start' = no offset, baselines are already relative to the top.
    return lines.map((l) => ({ ...l }))
  }

  // Compute the total height of the text block.
  // The block height is measured from the first baseline's ascent to the last
  // baseline plus its descent. We approximate descent as `lineHeight - baseline`
  // but since we only have cumulative baselines, we use the difference between
  // consecutive baselines as the line height.
  const textBlockHeight = computeTextBlockHeight(lines)

  // Available vertical space after accounting for the text block.
  const freeSpace = boxHeight - textBlockHeight

  if (freeSpace <= 0) {
    // Text is taller than the box — no alignment shift possible.
    return lines.map((l) => ({ ...l }))
  }

  let offset: number
  if (align === 'center') {
    offset = Math.round(freeSpace / 2)
  } else {
    // 'end'
    offset = Math.round(freeSpace)
  }

  // Shift every baseline by the same offset.
  return lines.map((l) => ({
    ...l,
    baseline: l.baseline + offset,
  }))
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                          */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Compute the total height of a text block from its lines.
 *
 * The baselines are cumulative from the text node's origin. The block height is
 * the last baseline plus an estimated descent (one line-height's worth below the
 * last baseline). We estimate descent as the spacing between the last two lines,
 * or a single line-height if there's only one line.
 */
function computeTextBlockHeight(lines: TextLine[]): number {
  if (lines.length === 0) return 0

  if (lines.length === 1) {
    // Single line: block height = baseline + estimated descent.
    // Descent ≈ 0.2 × lineHeight, but we approximate as 20% above baseline from
    // the top. A reasonable heuristic: total = baseline * 1.25.
    // Actually, simpler: we just need the distance from the first baseline's
    // ascent to the last baseline's descent. For a single line:
    // ascent ≈ 0.8 × lineHeight, descent ≈ 0.2 × lineHeight.
    // baseline = 0.8 × lineHeight, so total = baseline + 0.2 × lineHeight
    // = baseline + baseline / 4 = baseline * 1.25
    return Math.round(lines[0].baseline * 1.25)
  }

  // Multiple lines: the spacing between consecutive baselines gives us line height.
  const lastBaseline = lines[lines.length - 1].baseline
  const prevBaseline = lines[lines.length - 2].baseline
  const lineHeight = lastBaseline - prevBaseline

  // Block height = first baseline's ascent + (inter-line space) * (n-1) + last line's descent.
  // First line's ascent ≈ 0.8 × lineHeight = lines[0].baseline (that's how they're computed).
  // Last line's descent ≈ 0.2 × lineHeight.
  const ascent = lines[0].baseline
  const descent = Math.round(lineHeight * 0.2)

  return ascent + (lastBaseline - lines[0].baseline) + descent
}
