/**
 * Box-model helpers for the block layout system. All coordinates are slide units (1920×1080
 * default frame), origin at the block's own top-left.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box } from '../types'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* insetBox — shrink a box by padding                                              */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Shrink a box by uniform or `[block, inline]` padding.
 *
 * - A single number applies equally to all four edges.
 * - A `[block, inline]` tuple applies `block` to top+bottom and `inline` to left+right
 *   (slide-unit convention: block axis = vertical, inline axis = horizontal).
 *
 * The returned box's origin shifts inward by the padding amounts; width and height shrink
 * correspondingly. Values are clamped so the content box never goes negative.
 */
export function insetBox(
  box: Box,
  padding: number | [number, number]
): Box {
  const [block, inline] = typeof padding === 'number' ? [padding, padding] : padding
  const top = block
  const left = inline
  const right = inline
  const bottom = block
  const w = Math.max(0, box.width - left - right)
  const h = Math.max(0, box.height - top - bottom)
  return { x: box.x + left, y: box.y + top, width: w, height: h }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* anchorBox — position a sub-box at a named anchor                                */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Position a sub-box at a named anchor within a parent box. The sub-box has a fixed size;
 * the anchor determines where it sits.
 *
 * Anchor names follow a 3×3 grid:
 * ```
 * top-left      top-center      top-right
 * middle-left   middle-center   middle-right
 * bottom-left   bottom-center   bottom-right
 * ```
 *
 * If the sub-box is larger than the parent, it overflows to the bottom-right (anchor is
 * always relative to the parent's top-left corner).
 */
export function anchorBox(
  box: Box,
  anchor: string,
  size: { width: number; height: number }
): Box {
  let x: number
  let y: number

  // Horizontal — check for left/right; "center" is the horizontal middle keyword.
  if (anchor.includes('right')) {
    x = box.x + box.width - size.width
  } else if (anchor.includes('center')) {
    x = box.x + (box.width - size.width) / 2
  } else {
    x = box.x // left (default)
  }

  // Vertical — "middle" is the vertical middle keyword.
  if (anchor.includes('bottom')) {
    y = box.y + box.height - size.height
  } else if (anchor.includes('middle')) {
    y = box.y + (box.height - size.height) / 2
  } else {
    y = box.y // top (default)
  }

  return { x, y, width: size.width, height: size.height }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* splitBox — divide a box into two along an axis                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Split a box into two sub-boxes along an axis with a gutter between them.
 *
 * @param box    The box to split.
 * @param ratio  Fraction of space given to the first sub-box (0–1).
 * @param gutter Space between the two sub-boxes, in slide units.
 * @param axis   `'x'` = horizontal split (left/right), `'y'` = vertical split (top/bottom).
 * @returns A tuple `[first, second]` of two non-overlapping `Box` values.
 */
export function splitBox(
  box: Box,
  ratio: number,
  gutter: number,
  axis: 'x' | 'y' = 'x'
): [Box, Box] {
  const r = Math.max(0, Math.min(1, ratio))

  if (axis === 'x') {
    const available = Math.max(0, box.width - gutter)
    const w1 = Math.round(available * r)
    const w2 = available - w1
    const first: Box = { x: box.x, y: box.y, width: w1, height: box.height }
    const second: Box = { x: box.x + w1 + gutter, y: box.y, width: w2, height: box.height }
    return [first, second]
  }

  // axis === 'y'
  const available = Math.max(0, box.height - gutter)
  const h1 = Math.round(available * r)
  const h2 = available - h1
  const first: Box = { x: box.x, y: box.y, width: box.width, height: h1 }
  const second: Box = { x: box.x, y: box.y + h1 + gutter, width: box.width, height: h2 }
  return [first, second]
}
