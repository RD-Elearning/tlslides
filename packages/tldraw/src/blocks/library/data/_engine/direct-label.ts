/**
 * End-of-line direct labels with collision nudging, used instead of a legend when a chart has
 * few series. Pure function.
 */

import type { Box } from '../../../types'

export interface LabelAnchor {
  /** Anchor y of the series end point. */
  y: number
}

/**
 * Returns one y per anchor (same order) such that labels of height `labelHeight` do not overlap
 * (>= `labelHeight + gap` apart) and stay inside `box` vertically. Labels keep their anchor y
 * unless a neighbour forces a nudge; order by anchor y is preserved. If they cannot all fit,
 * they are packed evenly from the top of `box`.
 */
export function directLabel(
  anchors: ReadonlyArray<LabelAnchor>,
  box: Box,
  opts: { labelHeight: number; gap?: number }
): number[] {
  const gap = opts.gap ?? 2
  const pitch = opts.labelHeight + gap
  const n = anchors.length
  if (n === 0) return []
  const top = box.y
  const bottom = box.y + box.height - opts.labelHeight
  if ((n - 1) * pitch > bottom - top) {
    return anchors.map((_, i) => top + i * (n === 1 ? 0 : (bottom - top) / (n - 1)))
  }
  const order = anchors.map((a, i) => i).sort((a, b) => anchors[a].y - anchors[b].y || a - b)
  const ys = order.map((i) => Math.min(bottom, Math.max(top, anchors[i].y)))
  for (let i = 1; i < n; i++) if (ys[i] < ys[i - 1] + pitch) ys[i] = ys[i - 1] + pitch
  // If the downward pass pushed the last label past the bottom, shift back up.
  for (let i = n - 1; i >= 0; i--) {
    const limit = i === n - 1 ? bottom : ys[i + 1] - pitch
    if (ys[i] > limit) ys[i] = limit
  }
  const out = new Array<number>(n)
  order.forEach((orig, k) => {
    out[orig] = ys[k]
  })
  return out
}
