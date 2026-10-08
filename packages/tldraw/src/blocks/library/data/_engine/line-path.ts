/**
 * Line and area path data. Pure functions, no DOM, no block dependency.
 *
 * `monotone` is a Fritsch–Carlson monotone cubic: it never overshoots the data, so a line chart
 * of non-negative values cannot dip below zero between points.
 */

export interface Point {
  x: number
  y: number
}

export type CurveKind = 'linear' | 'monotone'

/** Round to 2 decimals and drop the trailing zeros, so path strings stay short and stable. */
function n(v: number): string {
  const r = Math.round(v * 100) / 100
  return String(Object.is(r, -0) ? 0 : r)
}

interface Seg {
  c1?: Point
  c2?: Point
  to: Point
}

/** Segments from points[0] onwards (the first point is the path's start, not a segment). */
function segments(points: Point[], curve: CurveKind): Seg[] {
  const count = points.length
  if (count < 2) return []
  if (curve === 'linear' || count === 2) {
    return points.slice(1).map((to) => ({ to }))
  }
  // Fritsch–Carlson tangents.
  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < count - 1; i++) {
    const w = points[i + 1].x - points[i].x
    dx.push(w)
    slope.push(w === 0 ? 0 : (points[i + 1].y - points[i].y) / w)
  }
  const m: number[] = new Array(count)
  m[0] = slope[0]
  m[count - 1] = slope[count - 2]
  for (let i = 1; i < count - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  }
  for (let i = 0; i < count - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / slope[i]
    const b = m[i + 1] / slope[i]
    const h = Math.hypot(a, b)
    if (h > 3) {
      const t = 3 / h
      m[i] = t * a * slope[i]
      m[i + 1] = t * b * slope[i]
    }
  }
  const out: Seg[] = []
  for (let i = 0; i < count - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    out.push({
      c1: { x: p0.x + dx[i] / 3, y: p0.y + (m[i] * dx[i]) / 3 },
      c2: { x: p1.x - dx[i] / 3, y: p1.y - (m[i + 1] * dx[i]) / 3 },
      to: p1,
    })
  }
  return out
}

function emit(segs: Seg[]): string {
  return segs
    .map((s) => (s.c1 && s.c2 ? `C${n(s.c1.x)} ${n(s.c1.y)} ${n(s.c2.x)} ${n(s.c2.y)} ${n(s.to.x)} ${n(s.to.y)}` : `L${n(s.to.x)} ${n(s.to.y)}`))
    .join('')
}

/** SVG `d` for an open polyline / curve through `points`. Empty string for no points. */
export function linePath(points: Point[], curve: CurveKind = 'linear'): string {
  if (points.length === 0) return ''
  return `M${n(points[0].x)} ${n(points[0].y)}${emit(segments(points, curve))}`
}

/**
 * SVG `d` for the closed band between `top` and `bottom` (same x positions, left to right).
 * The bottom edge is walked right to left along the same curve, so a stacked area's lower edge
 * matches the upper edge of the layer beneath it exactly.
 */
export function areaPath(top: Point[], bottom: Point[], curve: CurveKind = 'linear'): string {
  if (top.length === 0 || bottom.length === 0) return ''
  const topSegs = segments(top, curve)
  const botSegs = segments(bottom, curve)
  // Reverse the bottom edge: walk the segments backwards, swapping control points.
  const back: Seg[] = []
  for (let i = botSegs.length - 1; i >= 0; i--) {
    const s = botSegs[i]
    const from = i === 0 ? bottom[0] : botSegs[i - 1].to
    back.push({ c1: s.c2, c2: s.c1, to: from })
  }
  const last = bottom[bottom.length - 1]
  return `M${n(top[0].x)} ${n(top[0].y)}${emit(topSegs)}L${n(last.x)} ${n(last.y)}${emit(back)}Z`
}
