/**
 * Path data for chevrons and trapezoids (process chevrons, funnel, pyramid). Pure functions.
 */

import type { Box } from '../../types'

function n(v: number): string {
  const r = Math.round(v * 100) / 100
  return String(Object.is(r, -0) ? 0 : r)
}

/**
 * A right-pointing chevron. `notch` is the horizontal depth of the point and of the cut-out
 * tail. `first` squares the tail (leftmost step of a chain), `last` squares the head (rightmost).
 * Chain chevrons by placing each at `x += width - notch + gap`, so the tail of one nests into
 * the head of the previous.
 */
export function chevronPath(box: Box, notch: number, first = false, last = false): string {
  const { x, y, width: w, height: h } = box
  const k = Math.max(0, Math.min(notch, w / 2))
  const pts: Array<[number, number]> = [[x, y]]
  if (last) pts.push([x + w, y], [x + w, y + h])
  else pts.push([x + w - k, y], [x + w, y + h / 2], [x + w - k, y + h])
  pts.push([x, y + h])
  if (!first) pts.push([x + k, y + h / 2])
  return `M${pts.map(([px, py]) => `${n(px)} ${n(py)}`).join('L')}Z`
}

/**
 * A trapezoid: top edge inset by `topInset` on each side, bottom edge by `bottomInset`.
 * Funnel: topInset 0, bottomInset > 0. Pyramid layer: topInset >= 0 and bottomInset smaller.
 */
export function trapezoidPath(box: Box, topInset: number, bottomInset: number): string {
  const { x, y, width: w, height: h } = box
  const t = Math.max(0, Math.min(topInset, w / 2))
  const b = Math.max(0, Math.min(bottomInset, w / 2))
  const pts: Array<[number, number]> = [
    [x + t, y],
    [x + w - t, y],
    [x + w - b, y + h],
    [x + b, y + h],
  ]
  return `M${pts.map(([px, py]) => `${n(px)} ${n(py)}`).join('L')}Z`
}
