/**
 * CMP3 (composition README §2 CMP3, SURVEY B2) — the geometry of a slide connector: from two
 * endpoint boxes to a route, arrowheads and a label point. Pure numbers; `tls.g.connector`'s
 * layout draws it, the compiler sizes the connector shape from it and the layout report checks it.
 *
 * - **Sides.** `auto` faces the other box: the axis with the larger gap between the boxes wins
 *   (left/right when they sit side by side, top/bottom when stacked). An explicit side is kept.
 * - **Ports** sit `gap` outside the box edge (the arrowhead's tip rests there, never on the box).
 *   A side's port is its midpoint; two facing sides whose spans overlap share the overlap's middle,
 *   so a straight line between boxes in a row is perfectly level. A `round` end (a circle, a disc)
 *   is clipped to its inscribed ellipse.
 * - **Routes.** `straight`: facing sides with overlapping spans → level/plumb; otherwise the line
 *   between the centres, clipped to both boxes (radial — a hub and its satellites). `elbow`: right
 *   angles (out along the side's normal, across, in), corners rounded by up to `CORNER` units.
 *   `curved`: one cubic whose handles leave and enter along the sides' normals.
 * - **Heads** are stealth arrowheads (tip, two barbs, a notch); the stroke stops inside the notch
 *   so it never pokes through the tip. Size grows with the stroke weight.
 *
 * Pure: no DOM.
 */

import type { Box, ConnectorSide, Pt } from '../types'

export type ConnectorRoute = 'straight' | 'elbow' | 'curved'
type Side = Exclude<ConnectorSide, 'auto'>

/** Stroke widths per weight (slide units). */
export const CONNECTOR_WEIGHT = { hairline: 2, md: 3, bold: 5 } as const
/** Largest rounded-corner radius of an elbow. */
export const CORNER = 20
/** Shortest visible line (between the two ports) before the oracle calls it too short. */
export const MIN_CONNECTOR_LENGTH = 40

export interface ConnectorEndGeom {
  box: Box
  side?: ConnectorSide
  /** Clip to the inscribed ellipse (a circle shape, a disc) instead of the box. */
  round?: boolean
}

export interface RouteInput {
  from: ConnectorEndGeom
  to: ConnectorEndGeom
  route?: ConnectorRoute
  head?: 'end' | 'both' | 'none'
  /** Stroke width. */
  width: number
}

export interface ArrowHead {
  tip: Pt
  /** Unit direction the head points in. */
  dir: Pt
  /** Closed path of the head. */
  d: string
}

export interface RouteGeom {
  /** The stroke's path (trimmed under the heads). */
  d: string
  heads: { start?: ArrowHead; end?: ArrowHead }
  /** The untrimmed route flattened to a polyline (port to port): oracle and label placement. */
  samples: Pt[]
  /** Length of `samples`. */
  length: number
  /** The point halfway along the route. */
  mid: Pt
  sides: { from: Side; to: Side }
  /** Bounding box of everything painted (stroke, heads), not padded. */
  bounds: Box
  /** Ports (where the route starts and ends, `gap` off the boxes). */
  ports: { from: Pt; to: Pt }
  /** The endpoint boxes overlap (nothing to connect). */
  overlap: boolean
}

const NORMAL: Record<Side, Pt> = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } }
const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

const cx = (b: Box) => b.x + b.width / 2
const cy = (b: Box) => b.y + b.height / 2
const r2 = (v: number) => Math.round(v * 100) / 100
const fmt = (p: Pt) => `${r2(p.x)} ${r2(p.y)}`
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k })
const len = (a: Pt) => Math.hypot(a.x, a.y)
const unit = (a: Pt): Pt => {
  const l = len(a)
  return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 1, y: 0 }
}

/** Gap between a box edge and a port: room for the tip to breathe. */
export function portGap(width: number): number {
  return Math.round(8 + width * 1.5)
}

/** Arrowhead length for a stroke width. */
export function headLength(width: number): number {
  return Math.round(12 + width * 2.6)
}

function gaps(a: Box, b: Box): { gx: number; gy: number } {
  const gx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width))
  const gy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height))
  return { gx, gy }
}

/** The side of `a` facing `b`. */
function facing(a: Box, b: Box, axis: 'x' | 'y'): Side {
  if (axis === 'x') return cx(b) >= cx(a) ? 'right' : 'left'
  return cy(b) >= cy(a) ? 'bottom' : 'top'
}

/** Resolve `auto` sides. */
export function resolveSides(a: ConnectorEndGeom, b: ConnectorEndGeom): { from: Side; to: Side } {
  const sa = a.side && a.side !== 'auto' ? a.side : undefined
  const sb = b.side && b.side !== 'auto' ? b.side : undefined
  if (sa && sb) return { from: sa, to: sb }
  const { gx, gy } = gaps(a.box, b.box)
  const axis: 'x' | 'y' = gx >= gy ? 'x' : 'y'
  if (sa) {
    // The other end faces back along the axis `sa` leaves on, unless the boxes do not allow it.
    const ax: 'x' | 'y' = sa === 'left' || sa === 'right' ? 'x' : 'y'
    return { from: sa, to: facing(b.box, a.box, ax) }
  }
  if (sb) {
    const ax: 'x' | 'y' = sb === 'left' || sb === 'right' ? 'x' : 'y'
    return { from: facing(a.box, b.box, ax), to: sb }
  }
  return { from: facing(a.box, b.box, axis), to: facing(b.box, a.box, axis) }
}

/** Midpoint of a side, pushed `gap` out along its normal. */
function sidePort(b: Box, side: Side, gap: number, along?: number): Pt {
  const n = NORMAL[side]
  if (side === 'left' || side === 'right') {
    const x = side === 'left' ? b.x : b.x + b.width
    return { x: x + n.x * gap, y: along ?? cy(b) }
  }
  const y = side === 'top' ? b.y : b.y + b.height
  return { x: along ?? cx(b), y: y + n.y * gap }
}

/** Where the ray from the box centre towards `toward` leaves the box (or its ellipse), plus `gap`. */
function radialPort(e: ConnectorEndGeom, toward: Pt, gap: number): Pt {
  const c = { x: cx(e.box), y: cy(e.box) }
  const d = unit(sub(toward, c))
  const hw = e.box.width / 2
  const hh = e.box.height / 2
  let t: number
  if (e.round) {
    // ray–ellipse: (t dx / hw)^2 + (t dy / hh)^2 = 1
    t = 1 / Math.sqrt((d.x / Math.max(1e-6, hw)) ** 2 + (d.y / Math.max(1e-6, hh)) ** 2)
  } else {
    const tx = Math.abs(d.x) > 1e-9 ? hw / Math.abs(d.x) : Infinity
    const ty = Math.abs(d.y) > 1e-9 ? hh / Math.abs(d.y) : Infinity
    t = Math.min(tx, ty)
  }
  return add(c, mul(d, t + gap))
}

/** A polyline with rounded corners as path commands (quadratic joins), and its flattened points. */
function roundedPolyline(pts: Pt[], radius: number): { d: string; flat: Pt[] } {
  const clean: Pt[] = []
  for (const p of pts) {
    const last = clean[clean.length - 1]
    if (!last || len(sub(p, last)) > 0.5) clean.push(p)
  }
  // Drop collinear middles.
  const q: Pt[] = []
  for (let i = 0; i < clean.length; i++) {
    if (i > 0 && i < clean.length - 1) {
      const a = unit(sub(clean[i], clean[i - 1]))
      const b = unit(sub(clean[i + 1], clean[i]))
      if (Math.abs(a.x * b.y - a.y * b.x) < 1e-6 && a.x * b.x + a.y * b.y > 0) continue
    }
    q.push(clean[i])
  }
  if (q.length < 2) return { d: q.length ? `M${fmt(q[0])}` : '', flat: q }
  let d = `M${fmt(q[0])}`
  const flat: Pt[] = [q[0]]
  for (let i = 1; i < q.length - 1; i++) {
    const p = q[i]
    const inLen = len(sub(p, q[i - 1]))
    const outLen = len(sub(q[i + 1], p))
    const r = Math.max(0, Math.min(radius, inLen / 2, outLen / 2))
    const a = add(p, mul(unit(sub(q[i - 1], p)), r))
    const b = add(p, mul(unit(sub(q[i + 1], p)), r))
    d += `L${fmt(a)}Q${fmt(p)} ${fmt(b)}`
    flat.push(a)
    for (let k = 1; k <= 6; k++) {
      const t = k / 6
      flat.push({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * p.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * p.y + t * t * b.y })
    }
  }
  d += `L${fmt(q[q.length - 1])}`
  flat.push(q[q.length - 1])
  return { d, flat }
}

function cubicAt(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  }
}

function polyLength(pts: Pt[]): number {
  let s = 0
  for (let i = 1; i < pts.length; i++) s += len(sub(pts[i], pts[i - 1]))
  return s
}

function pointAt(pts: Pt[], at: number): Pt {
  let s = 0
  for (let i = 1; i < pts.length; i++) {
    const seg = len(sub(pts[i], pts[i - 1]))
    if (s + seg >= at && seg > 0) return add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), (at - s) / seg))
    s += seg
  }
  return pts[pts.length - 1] ?? { x: 0, y: 0 }
}

/** A stealth arrowhead with its tip at `tip`, pointing along `dir`. */
export function arrowHead(tip: Pt, dir: Pt, length: number): ArrowHead {
  const u = unit(dir)
  const n = { x: -u.y, y: u.x }
  const half = length * 0.42
  const back = sub(tip, mul(u, length))
  const l = add(back, mul(n, half))
  const r = sub(back, mul(n, half))
  const notch = sub(tip, mul(u, length * 0.7))
  return { tip, dir: u, d: `M${fmt(tip)}L${fmt(l)}L${fmt(notch)}L${fmt(r)}Z` }
}

/** The connector route between two boxes. Deterministic. */
export function connectorRoute(input: RouteInput): RouteGeom {
  const w = Math.max(1, input.width)
  const gap = portGap(w)
  const H = headLength(w)
  const route: ConnectorRoute = input.route === 'elbow' || input.route === 'curved' ? input.route : 'straight'
  const head = input.head === 'both' || input.head === 'none' ? input.head : 'end'
  const A = input.from
  const B = input.to
  const sides = resolveSides(A, B)
  const { gx, gy } = gaps(A.box, B.box)
  const overlap = gx < 0 && gy < 0
  const explicit = (e: ConnectorEndGeom) => !!e.side && e.side !== 'auto'

  let p0: Pt
  let p3: Pt
  const horizontal = sides.from === 'left' || sides.from === 'right'
  const facingPair = OPPOSITE[sides.from] === sides.to
  // Facing sides whose spans overlap: share the overlap's middle (a level / plumb line).
  let shared: number | undefined
  if (facingPair) {
    const lo = horizontal ? Math.max(A.box.y, B.box.y) : Math.max(A.box.x, B.box.x)
    const hi = horizontal ? Math.min(A.box.y + A.box.height, B.box.y + B.box.height) : Math.min(A.box.x + A.box.width, B.box.x + B.box.width)
    if (hi - lo > 2 * H) shared = (lo + hi) / 2
  }

  let d: string
  let flat: Pt[]
  if (route === 'straight') {
    if (shared !== undefined || explicit(A) || explicit(B)) {
      p0 = sidePort(A.box, sides.from, gap, shared)
      p3 = sidePort(B.box, sides.to, gap, shared)
      if (A.round && shared === undefined && !explicit(A)) p0 = radialPort(A, p3, gap)
      if (B.round && shared === undefined && !explicit(B)) p3 = radialPort(B, p0, gap)
    } else {
      const ca = { x: cx(A.box), y: cy(A.box) }
      const cb = { x: cx(B.box), y: cy(B.box) }
      p0 = radialPort(A, cb, gap)
      p3 = radialPort(B, ca, gap)
    }
    flat = [p0, p3]
    d = ''
  } else {
    // An elbow between boxes whose middles almost line up would draw a tiny jog: level it.
    const nearLevel = shared !== undefined && Math.abs(horizontal ? cy(A.box) - cy(B.box) : cx(A.box) - cx(B.box)) < 24
    const along = route === 'elbow' && !nearLevel ? undefined : shared
    p0 = sidePort(A.box, sides.from, gap, along)
    p3 = sidePort(B.box, sides.to, gap, along)
    if (route === 'curved') {
      const dist = len(sub(p3, p0))
      const k = Math.max(48, dist * 0.42)
      const c1 = add(p0, mul(NORMAL[sides.from], k))
      const c2 = add(p3, mul(NORMAL[sides.to], k))
      flat = []
      for (let i = 0; i <= 32; i++) flat.push(cubicAt(p0, c1, c2, p3, i / 32))
      d = `M${fmt(p0)}C${fmt(c1)} ${fmt(c2)} ${fmt(p3)}`
    } else {
      const pts = elbowPoints(p0, sides.from, p3, sides.to, H)
      const rp = roundedPolyline(pts, CORNER)
      flat = rp.flat
      d = rp.d
    }
  }

  // Heads: the end head points along the final direction into B; the stroke stops in its notch.
  const total = polyLength(flat)
  const trim = H * 0.7
  const endDir = unit(sub(flat[flat.length - 1], pointAt(flat, Math.max(0, total - Math.min(H, total / 2)))))
  const startDir = unit(sub(flat[0], pointAt(flat, Math.min(total, Math.min(H, total / 2)))))
  const heads: RouteGeom['heads'] = {}
  if (head !== 'none') heads.end = arrowHead(p3, endDir, H)
  if (head === 'both') heads.start = arrowHead(p0, startDir, H)
  const s0 = heads.start ? Math.min(trim, total / 2) : 0
  const s1 = heads.end ? Math.min(trim, total / 2) : 0
  if (route === 'curved') {
    // Trim a cubic by moving its end points (and handles) in along the end tangents.
    const c = d.match(/C([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)/)
    if (c) {
      const c1 = { x: +c[1], y: +c[2] }
      const c2 = { x: +c[3], y: +c[4] }
      const q0 = sub(p0, mul(startDir, s0))
      const q3 = sub(p3, mul(endDir, s1))
      d = `M${fmt(q0)}C${fmt(sub(c1, mul(startDir, s0)))} ${fmt(sub(c2, mul(endDir, s1)))} ${fmt(q3)}`
    }
  } else if (route === 'straight') {
    const q0 = sub(p0, mul(startDir, s0))
    const q3 = sub(p3, mul(endDir, s1))
    d = `M${fmt(q0)}L${fmt(q3)}`
  } else {
    d = trimPolylinePath(d, s0, s1)
  }

  const xs = flat.map((p) => p.x)
  const ys = flat.map((p) => p.y)
  for (const h of [heads.start, heads.end]) {
    if (!h) continue
    const n = { x: -h.dir.y, y: h.dir.x }
    for (const p of [h.tip, add(sub(h.tip, mul(h.dir, H)), mul(n, H * 0.42)), sub(sub(h.tip, mul(h.dir, H)), mul(n, H * 0.42))]) {
      xs.push(p.x)
      ys.push(p.y)
    }
  }
  const x1 = Math.min(...xs) - w
  const y1 = Math.min(...ys) - w
  const x2 = Math.max(...xs) + w
  const y2 = Math.max(...ys) + w
  return {
    d,
    heads,
    samples: flat,
    length: total,
    mid: pointAt(flat, total / 2),
    sides,
    bounds: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
    ports: { from: p0, to: p3 },
    overlap,
  }
}

/** Orthogonal points from port `p0` (leaving along `s0`) to port `p3` (entering against `s3`). */
function elbowPoints(p0: Pt, s0: Side, p3: Pt, s3: Side, stub: number): Pt[] {
  const n0 = NORMAL[s0]
  const n3 = NORMAL[s3]
  const h0 = s0 === 'left' || s0 === 'right'
  const h3 = s3 === 'left' || s3 === 'right'
  const ahead = (p: Pt, n: Pt, q: Pt) => (q.x - p.x) * n.x + (q.y - p.y) * n.y
  if (h0 && h3 && OPPOSITE[s0] === s3 && ahead(p0, n0, p3) > 0) {
    const mx = (p0.x + p3.x) / 2
    return [p0, { x: mx, y: p0.y }, { x: mx, y: p3.y }, p3]
  }
  if (!h0 && !h3 && OPPOSITE[s0] === s3 && ahead(p0, n0, p3) > 0) {
    const my = (p0.y + p3.y) / 2
    return [p0, { x: p0.x, y: my }, { x: p3.x, y: my }, p3]
  }
  if (h0 !== h3) {
    // One bend: leave along n0 to the corner, enter along -n3.
    const corner = h0 ? { x: p3.x, y: p0.y } : { x: p0.x, y: p3.y }
    if (ahead(p0, n0, corner) > 0 && ahead(p3, n3, corner) > 0) return [p0, corner, p3]
  }
  // Fallback: stubs out of both sides, joined by an L.
  const a = add(p0, mul(n0, stub))
  const b = add(p3, mul(n3, stub))
  const corner = h0 ? { x: a.x, y: b.y } : { x: b.x, y: a.y }
  return [p0, a, corner, b, p3]
}

/** Shorten an `M…L…Q…L…` path's first and last straight runs by `s0` / `s1`. */
function trimPolylinePath(d: string, s0: number, s1: number): string {
  const nums = (s: string) => s.trim().split(/[ ,]+/).map(Number)
  const cmds = d.match(/[MLQ][^MLQ]*/g) ?? []
  if (cmds.length < 2) return d
  const first = nums(cmds[0].slice(1))
  const second = nums(cmds[1].slice(1))
  if (s0 > 0 && cmds[1][0] === 'L') {
    const p = { x: first[0], y: first[1] }
    const q = { x: second[0], y: second[1] }
    const m = add(p, mul(unit(sub(q, p)), Math.min(s0, len(sub(q, p)))))
    cmds[0] = `M${fmt(m)}`
  }
  const last = cmds[cmds.length - 1]
  if (s1 > 0 && last[0] === 'L') {
    const prev = cmds[cmds.length - 2]
    const pv = nums(prev.slice(1))
    const p = { x: pv[pv.length - 2], y: pv[pv.length - 1] }
    const e = nums(last.slice(1))
    const q = { x: e[0], y: e[1] }
    const m = sub(q, mul(unit(sub(q, p)), Math.min(s1, len(sub(q, p)))))
    cmds[cmds.length - 1] = `L${fmt(m)}`
  }
  return cmds.join('')
}

/** Distance from point `p` to the segment `a`–`b`. */
export function segmentDistance(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a)
  const l2 = ab.x * ab.x + ab.y * ab.y
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2)) : 0
  return len(sub(p, add(a, mul(ab, t))))
}

/** Does the polyline cross (or run within `pad` of) the box? */
export function polylineHitsBox(pts: Pt[], box: Box, pad = 0): boolean {
  const b = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad }
  const inside = (p: Pt) => p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height
  for (let i = 0; i < pts.length; i++) {
    if (inside(pts[i])) return true
    if (i === 0) continue
    // Sample the segment finely (boxes are large compared to the step).
    const a = pts[i - 1]
    const c = pts[i]
    const n = Math.ceil(len(sub(c, a)) / 6)
    for (let k = 1; k < n; k++) if (inside(add(a, mul(sub(c, a), k / n)))) return true
  }
  return false
}
