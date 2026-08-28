import { Utils } from '@tlslides/core'
import Vec from '@tlslides/vec'
import getStroke, { getStrokePoints } from 'perfect-freehand'
import type { ShapeStyles } from '~types'
import { getShapeStyle, clampCornerRadius } from '../shared'

// Points along a quarter-ellipse arc, in the same [x, y, pressure] shape `Vec.pointsBetween`
// returns (the third element feeds perfect-freehand's width simulation — thinner mid-stroke,
// thicker at the ends, same formula `Vec.pointsBetween` itself uses).
function getArcPoints(
  center: number[],
  startAngle: number,
  endAngle: number,
  rx: number,
  ry: number,
  steps: number
): number[][] {
  return Array.from(Array(steps)).map((_, i) => {
    const t = i / (steps - 1)
    const angle = startAngle + (endAngle - startAngle) * t
    const k = Math.min(1, 0.5 + Math.abs(0.5 - t))
    return [center[0] + rx * Math.cos(angle), center[1] + ry * Math.sin(angle), k]
  })
}

function getRectangleDrawPoints(id: string, style: ShapeStyles, size: number[]) {
  const styles = getShapeStyle(style)

  const getRandom = Utils.rng(id)

  const sw = styles.strokeWidth

  // Dimensions
  const w = Math.max(0, size[0])
  const h = Math.max(0, size[1])

  // Random corner offsets
  const offsets = Array.from(Array(4)).map(() => {
    return [getRandom() * sw * 0.75, getRandom() * sw * 0.75]
  })

  // Corners
  const tl = Vec.add([sw / 2, sw / 2], offsets[0])
  const tr = Vec.add([w - sw / 2, sw / 2], offsets[1])
  const br = Vec.add([w - sw / 2, h - sw / 2], offsets[2])
  const bl = Vec.add([sw / 2, h - sw / 2], offsets[3])

  // Which side to start drawing first
  const rm = Math.round(Math.abs(getRandom() * 2 * 4))

  // Corner radii. Default (no `style.cornerRadius`) keeps the pre-8a look: a hand-drawn corner
  // rounds a little just from the wobble of the stroke, proportional to stroke width. When the
  // user sets an explicit radius, honor it instead — clamped so it can't exceed the shape.
  const hasExplicitCornerRadius = style.cornerRadius !== undefined
  const rx = hasExplicitCornerRadius
    ? clampCornerRadius(style.cornerRadius as number, [w, h])
    : Math.min(w / 2, sw * 2)
  const ry = hasExplicitCornerRadius
    ? clampCornerRadius(style.cornerRadius as number, [w, h])
    : Math.min(h / 2, sw * 2)

  // Number of points per side
  const px = Math.max(8, Math.floor(w / 16))
  const py = Math.max(8, Math.floor(h / 16))

  // Inset each line by the corner radii.
  const edges = [
    Vec.pointsBetween(Vec.add(tl, [rx, 0]), Vec.sub(tr, [rx, 0]), px), // top
    Vec.pointsBetween(Vec.add(tr, [0, ry]), Vec.sub(br, [0, ry]), py), // right
    Vec.pointsBetween(Vec.sub(br, [rx, 0]), Vec.add(bl, [rx, 0]), px), // bottom
    Vec.pointsBetween(Vec.sub(bl, [0, ry]), Vec.add(tl, [0, ry]), py), // left
  ]

  // At the default (small, implicit) radius, leaving the corner gap between two trimmed edges for
  // perfect-freehand to connect on its own is enough — the gap is a couple of pixels, and the
  // hand-drawn wobble hides it, which is exactly the "rounds a little" look tldraw's Draw
  // rectangle has always had. Once `style.cornerRadius` sets an *explicit* radius, that same gap
  // can be a hundred-plus pixels wide, and left alone it renders as a visible straight chord — a
  // cut corner, not a curve (caught by looking at the actual PNG in tools/visual/shots/styles.png
  // during Phase 8a — a plain rectangle with a 120px radius rendered as a hexagon). So in that case
  // each gap is bridged with real quarter-ellipse arc points instead of leaving it to chance.
  let lines: number[][][]
  if (hasExplicitCornerRadius && rx > 0 && ry > 0) {
    const arcSteps = Math.max(6, Math.round((rx + ry) / 2 / 6) + 2)
    // Each edge is followed by the arc at the corner it leads into: top -> top-right,
    // right -> bottom-right, bottom -> bottom-left, left -> top-left. Endpoints are shared with
    // the adjacent edge/arc (e.g. the top edge's last point is the arc's first), which is
    // harmless — perfect-freehand tolerates the zero-length segment this produces.
    const arcsByEdge = [
      getArcPoints(Vec.add(tr, [-rx, ry]), (3 * Math.PI) / 2, 2 * Math.PI, rx, ry, arcSteps), // top-right
      getArcPoints(Vec.add(br, [-rx, -ry]), 0, Math.PI / 2, rx, ry, arcSteps), // bottom-right
      getArcPoints(Vec.add(bl, [rx, -ry]), Math.PI / 2, Math.PI, rx, ry, arcSteps), // bottom-left
      getArcPoints(Vec.add(tl, [rx, ry]), Math.PI, (3 * Math.PI) / 2, rx, ry, arcSteps), // top-left
    ]
    lines = Utils.rotateArray(
      edges.map((edge, i) => [...edge, ...arcsByEdge[i]]),
      rm
    )
  } else {
    lines = Utils.rotateArray(edges, rm)
  }

  // For the final points, include the first half of the first line again,
  // so that the line wraps around and avoids ending on a sharp corner.
  // This has a bit of finesse and magic—if you change the points between
  // function, then you'll likely need to change this one too.

  const points = [...lines.flat(), ...lines[0]].slice(
    5,
    Math.floor((rm % 2 === 0 ? px : py) / -2) + 3
  )

  return {
    points,
  }
}

function getDrawStrokeInfo(id: string, style: ShapeStyles, size: number[]) {
  const { points } = getRectangleDrawPoints(id, style, size)
  const { strokeWidth } = getShapeStyle(style)
  const options = {
    size: strokeWidth,
    thinning: 0.65,
    streamline: 0.3,
    smoothing: 1,
    simulatePressure: false,
    last: true,
  }
  return { points, options }
}

export function getRectanglePath(id: string, style: ShapeStyles, size: number[]) {
  const { points, options } = getDrawStrokeInfo(id, style, size)
  const stroke = getStroke(points, options)
  return Utils.getSvgPathFromStroke(stroke)
}

export function getRectangleIndicatorPathTDSnapshot(
  id: string,
  style: ShapeStyles,
  size: number[]
) {
  const { points, options } = getDrawStrokeInfo(id, style, size)
  const strokePoints = getStrokePoints(points, options)
  return Utils.getSvgPathFromStroke(
    strokePoints.map((pt) => pt.point.slice(0, 2)),
    false
  )
}
