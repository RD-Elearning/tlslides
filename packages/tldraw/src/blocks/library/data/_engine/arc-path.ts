/**
 * Arc / ring path data for slices, rings and gauges.
 *
 * Extracted from `tls.d.donut` (P0.6) so pie, donut, progress-ring, gauge and radar share one
 * implementation. Pure functions, no DOM, no block dependency.
 *
 * Angles are radians, 0 at +x (3 o'clock), increasing clockwise on screen (SVG y points down).
 */

/** SVG `d` for a pie wedge: centre, out to the start of the arc, arc to the end, close. */
export function wedgePath(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  largeArc: 0 | 1,
  sweep: 0 | 1 = 1
): string {
  const x1 = cx + r * Math.cos(a0)
  const y1 = cy + r * Math.sin(a0)
  const x2 = cx + r * Math.cos(a1)
  const y2 = cy + r * Math.sin(a1)
  // sweep 1 = clockwise (outer boundary); sweep 0 = counter-clockwise (the cut-out of a ring).
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2} Z`
}

/**
 * SVG `d` for an annular sector (a slice of a ring), or a plain pie wedge when `rInner <= 0`.
 *
 * A ring is the outer wedge plus an opposite-wound inner wedge, so the default non-zero fill rule
 * cuts the hole out and both renderers need nothing more than a `path` node. The two radial
 * edges the wedges share at the centre cancel and are not visible.
 *
 * Callers cap a full circle themselves: a sweep of exactly 2π makes start and end coincide and
 * the arc degenerates (use 2π minus a small epsilon).
 *
 * @param span  Angular extent in radians. Defaults to `a1 - a0`. Pass it when the caller already
 *              has the exact value: `a1 - a0` can differ from it by one ulp, which flips the
 *              large-arc flag for an exactly-half slice.
 */
export function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  a0: number,
  a1: number,
  span: number = a1 - a0
): string {
  const largeArc: 0 | 1 = span > Math.PI ? 1 : 0
  const outer = wedgePath(cx, cy, rOuter, a0, a1, largeArc, 1)
  if (!(rInner > 0)) return outer
  const inner = wedgePath(cx, cy, rInner, a0, a1, largeArc, 0)
  // The inner wedge is traced start -> end like the outer one, so only the sweep flag reverses it.
  return `${outer} ${inner}`
}
