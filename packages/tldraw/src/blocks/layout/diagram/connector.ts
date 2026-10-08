/**
 * Connectors between two boxes, anchored at edge midpoints and never crossing either box.
 * Pure functions; the result is a `line` node (straight) or a `group` of path + arrowhead
 * (elbow, because `path` nodes carry no marker).
 */

import type { Box, LayoutNode, Pt } from '../../types'

export type Side = 'top' | 'right' | 'bottom' | 'left'

export interface ConnectorOpts {
  kind: 'straight' | 'elbow'
  head: 'arrow' | 'none'
  /** `auto` picks the facing sides from the boxes' relative position. */
  sides?: 'auto' | { from: Side; to: Side }
  color: string
  /** Stroke width. Default 2. */
  width?: number
  /** Length of the straight stub leaving each box when routing an elbow. Default 16. */
  clearance?: number
  /** Elbow only: coordinate of the middle lane (x for left/right sides, y for top/bottom). */
  lane?: number
  /** Arrowhead length. Default 8. */
  headSize?: number
}

const DIR: Record<Side, Pt> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}

export function anchor(box: Box, side: Side): Pt {
  switch (side) {
    case 'top':
      return { x: box.x + box.width / 2, y: box.y }
    case 'bottom':
      return { x: box.x + box.width / 2, y: box.y + box.height }
    case 'left':
      return { x: box.x, y: box.y + box.height / 2 }
    default:
      return { x: box.x + box.width, y: box.y + box.height / 2 }
  }
}

/** Facing sides: along the axis where the boxes are furthest apart. */
export function autoSides(from: Box, to: Box): { from: Side; to: Side } {
  const gapX = Math.max(to.x - (from.x + from.width), from.x - (to.x + to.width))
  const gapY = Math.max(to.y - (from.y + from.height), from.y - (to.y + to.height))
  const fcx = from.x + from.width / 2
  const fcy = from.y + from.height / 2
  const tcx = to.x + to.width / 2
  const tcy = to.y + to.height / 2
  if (gapX >= gapY) return tcx >= fcx ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' }
  return tcy >= fcy ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' }
}

const isH = (s: Side) => s === 'left' || s === 'right'

function simplify(pts: Pt[]): Pt[] {
  const out: Pt[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.x - p.x) < 1e-9 && Math.abs(last.y - p.y) < 1e-9) continue
    out.push(p)
  }
  // Drop collinear middle points.
  for (let i = out.length - 2; i >= 1; i--) {
    const a = out[i - 1]
    const b = out[i]
    const c = out[i + 1]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cross) < 1e-9) out.splice(i, 1)
  }
  return out
}

/** The polyline a connector follows, from the `from` anchor to the `to` anchor. */
export function connectorRoute(from: Box, to: Box, opts: Pick<ConnectorOpts, 'kind' | 'sides' | 'clearance' | 'lane'>): { points: Pt[]; fromSide: Side; toSide: Side } {
  const sides = !opts.sides || opts.sides === 'auto' ? autoSides(from, to) : opts.sides
  const a = anchor(from, sides.from)
  const b = anchor(to, sides.to)
  if (opts.kind === 'straight') return { points: [a, b], fromSide: sides.from, toSide: sides.to }

  const c = opts.clearance ?? 16
  const da = DIR[sides.from]
  const db = DIR[sides.to]
  const pts: Pt[] = [a]
  if (isH(sides.from) && isH(sides.to)) {
    const facing = da.x * (b.x - a.x) > 0 && db.x * (a.x - b.x) > 0
    if (facing) {
      const mx = opts.lane ?? (a.x + b.x) / 2
      pts.push({ x: mx, y: a.y }, { x: mx, y: b.y })
    } else {
      // Same direction or backwards: leave by a stub, run along a lane clear of both boxes.
      const outA = a.x + da.x * c
      const outB = b.x + db.x * c
      const mx = opts.lane ?? (da.x > 0 ? Math.max(outA, outB) : Math.min(outA, outB))
      pts.push({ x: mx, y: a.y }, { x: mx, y: b.y })
    }
  } else if (!isH(sides.from) && !isH(sides.to)) {
    const facing = da.y * (b.y - a.y) > 0 && db.y * (a.y - b.y) > 0
    if (facing) {
      const my = opts.lane ?? (a.y + b.y) / 2
      pts.push({ x: a.x, y: my }, { x: b.x, y: my })
    } else {
      const outA = a.y + da.y * c
      const outB = b.y + db.y * c
      const my = opts.lane ?? (da.y > 0 ? Math.max(outA, outB) : Math.min(outA, outB))
      pts.push({ x: a.x, y: my }, { x: b.x, y: my })
    }
  } else if (isH(sides.from)) {
    // Horizontal exit, vertical entry: one corner above/below the target anchor.
    pts.push({ x: b.x, y: a.y })
  } else {
    pts.push({ x: a.x, y: b.y })
  }
  pts.push(b)
  return { points: simplify(pts), fromSide: sides.from, toSide: sides.to }
}

function d(points: Pt[]): string {
  const r = (v: number) => String(Math.round(v * 100) / 100)
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${r(p.x)} ${r(p.y)}`).join('')
}

/** A connector as a LayoutNode, anchored on box edges. */
export function connector(from: Box, to: Box, opts: ConnectorOpts): LayoutNode {
  const { points } = connectorRoute(from, to, opts)
  const width = opts.width ?? 2
  const stroke = { color: opts.color, width }
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const bounds: Box = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
  if (opts.kind === 'straight') {
    return {
      k: 'line',
      box: bounds,
      part: 'connector',
      from: points[0],
      to: points[points.length - 1],
      stroke,
      ...(opts.head === 'arrow' ? { marker: { kind: 'arrow', color: opts.color } } : {}),
    }
  }
  if (opts.head !== 'arrow' || points.length < 2) {
    return { k: 'path', box: bounds, part: 'connector', d: d(points), stroke }
  }
  // Elbow with an arrowhead: stop the stem at the head's base, draw the head as a filled triangle.
  const size = opts.headSize ?? 8
  const tip = points[points.length - 1]
  const prev = points[points.length - 2]
  const len = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1
  const ux = (tip.x - prev.x) / len
  const uy = (tip.y - prev.y) / len
  const base = { x: tip.x - ux * size, y: tip.y - uy * size }
  const half = size * 0.5
  const stem = [...points.slice(0, -1), base]
  const head = `${d([tip, { x: base.x - uy * half, y: base.y + ux * half }, { x: base.x + uy * half, y: base.y - ux * half }])}Z`
  return {
    k: 'group',
    box: bounds,
    part: 'connector',
    children: [
      { k: 'path', box: bounds, part: 'connector/stem', d: d(stem), stroke },
      { k: 'path', box: bounds, part: 'connector/head', d: head, fill: { type: 'solid', color: opts.color } },
    ],
  }
}
