import { Utils } from '@tlslides/core'
import Vec from '@tlslides/vec'
import getStroke, { getStrokePoints } from 'perfect-freehand'
import type { ShapeStyles } from '~types'
import { getShapeStyle } from './shape-styles'

// Phase 8c — shared "hand-drawn outline of an arbitrary closed polygon" geometry, backing the
// `DashStyle.Draw` look for PolygonUtil/StarUtil/SpeechBubbleUtil. Every existing hand-drawn shape
// (`rectangleHelpers.ts`, `triangleHelpers.ts`) hand-rolls its own version of this exact recipe —
// jitter each vertex by a shape-id-seeded random offset, walk the jittered vertices with
// `Vec.pointsBetween`, feed the result to `perfect-freehand` — because each one also has its own
// fixed vertex *count* (4, 3) baked into the offsets/rotation math. `getTriangleDrawPoints`
// generalises the least (it's already just "for each of N corners..."), so this is that function
// widened from a hardcoded 3 vertices to an arbitrary `vertices.length`, written once so the three
// new shapes in this phase don't each re-derive it a third and fourth and fifth time. It replaces
// the wraparound trick in `getRectangleDrawPoints` (which slices *why* the array to avoid a sharp
// starting corner) with the triangle helper's simpler version (append the first edge's points
// again) — that one already generalises to any polygon; the rectangle one is rectangle-specific
// tuning (`px`/`py`, an inset-by-corner-radius step) this shared version deliberately doesn't need,
// since none of Polygon/Star/SpeechBubble support a corner radius (see each util's own comment for
// why that's a scope cut, not an oversight).
function getPolygonDrawPoints(id: string, vertices: number[][], strokeWidth: number) {
  const n = vertices.length
  const getRandom = Utils.rng(id)

  const corners = vertices.map((v) => Vec.add(v, [getRandom() * strokeWidth * 0.75, getRandom() * strokeWidth * 0.75]))

  // Which edge to start drawing from — the same "rotate the edge list" trick every hand-drawn
  // shape here uses so the visible start/end seam isn't always on the same vertex.
  const rm = Math.round(Math.abs(getRandom() * 2 * n)) % n

  const lines = Utils.rotateArray(
    corners.map((c, i) => Vec.pointsBetween(c, corners[(i + 1) % n], 24)),
    rm
  )

  // Append the first edge's points again so the stroke wraps fully around and its start/end caps
  // land mid-edge rather than exactly on a sharp corner — see `getTriangleDrawPoints`'s identical
  // comment, which this mirrors.
  return [...lines.flat(), ...lines[0]]
}

const STROKE_OPTIONS = {
  thinning: 0.65,
  streamline: 0.3,
  smoothing: 1,
  simulatePressure: false,
  last: true,
}

/** The hand-drawn outline, as a filled SVG path (`fill`+`stroke` both set to the shape's own
 *  stroke colour, matching every other hand-drawn shape in this fork) — the "ink" path. */
export function getPolygonPath(id: string, style: ShapeStyles, vertices: number[][]): string {
  const { strokeWidth } = getShapeStyle(style)
  const points = getPolygonDrawPoints(id, vertices, strokeWidth)
  const stroke = getStroke(points, { ...STROKE_OPTIONS, size: strokeWidth })
  return Utils.getSvgPathFromStroke(stroke)
}

/** The same hand-drawn stroke's own *centerline* points (not the filled ink outline above) — used
 *  for the selection indicator and for the fill region under a hand-drawn outline, exactly the way
 *  `getRectangleIndicatorPathTDSnapshot`/`getTriangleIndicatorPathTDSnapshot` are used for their
 *  own shapes. */
export function getPolygonIndicatorPathTDSnapshot(
  id: string,
  style: ShapeStyles,
  vertices: number[][]
): string {
  const { strokeWidth } = getShapeStyle(style)
  const points = getPolygonDrawPoints(id, vertices, strokeWidth)
  const strokePoints = getStrokePoints(points, { ...STROKE_OPTIONS, size: strokeWidth })
  return Utils.getSvgPathFromStroke(
    strokePoints.map((pt) => pt.point.slice(0, 2)),
    false
  )
}
