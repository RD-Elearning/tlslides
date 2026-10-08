/**
 * Radial placement for cycle and hub-and-spoke diagrams. Pure functions.
 * Angles are radians, 0 at +x, clockwise on screen; the default start is 12 o'clock.
 */

import type { Box, Pt, Size } from '../../types'

/** `n` points evenly spaced on a circle, clockwise from `startAngle`. */
export function radial(n: number, center: Pt, radius: number, startAngle = -Math.PI / 2): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = startAngle + (i * 2 * Math.PI) / Math.max(1, n)
    out.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) })
  }
  return out
}

/**
 * `n` node boxes on the largest circle that keeps every node inside `box`, clockwise from the
 * top. The circle is centred in `box`.
 */
export function ringBoxes(n: number, box: Box, nodeSize: Size, startAngle = -Math.PI / 2): Box[] {
  const radius = Math.max(0, Math.min(box.width - nodeSize.width, box.height - nodeSize.height) / 2)
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  return radial(n, center, radius, startAngle).map((p) => ({
    x: p.x - nodeSize.width / 2,
    y: p.y - nodeSize.height / 2,
    width: nodeSize.width,
    height: nodeSize.height,
  }))
}
