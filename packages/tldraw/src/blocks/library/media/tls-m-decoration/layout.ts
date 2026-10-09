/**
 * Pure layout for tls.m.decoration — one `path` node, deterministic from `seed`.
 *
 * All geometry is built from absolute points and cubic Béziers (no arc commands) so rotation is a
 * plain point transform, and every point stays inside the box (the DOM renderer clips a path to its
 * box, the SVG renderer does not). No randomness: `mulberry32(seed)` drives the blob radii and the
 * wave phase, so the same seed always draws the same path.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import { DECORATION_SHAPES, type DecorationProps } from './schema'
import { enumOf, side, tintOf } from '../_kit'
import { roughOutline, roughPaths } from './rough'

/** Deterministic PRNG: the same seed gives the same sequence. */
export function mulberry32(seed: number): () => number {
  let a = (Math.floor(Number.isFinite(seed) ? seed : 1) >>> 0) || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f = (v: number) => String(Math.round(v * 100) / 100)
type Pt = [number, number]
const rot = (p: Pt, c: Pt, deg: number): Pt => {
  const a = (deg * Math.PI) / 180
  const dx = p[0] - c[0]
  const dy = p[1] - c[1]
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]
}

/** Closed smooth blob through `n` seeded radii (Catmull-Rom as cubic Béziers). */
export function blobPath(cx: number, cy: number, R: number, seed: number, rotation: number): string {
  const rnd = mulberry32(seed)
  const n = 7
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const th = (2 * Math.PI * i) / n
    const r = R * 0.9 * (0.72 + 0.28 * rnd())
    pts.push(rot([cx + r * Math.cos(th), cy + r * Math.sin(th)], [cx, cy], rotation))
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + 'Z'
}

/** Open circular arc from angle `a0` sweeping `sweep` degrees, as cubic segments of at most 80 degrees. */
export function arcPath(cx: number, cy: number, r: number, a0: number, sweep: number): string {
  const segs = Math.max(1, Math.ceil(Math.abs(sweep) / 80))
  const da = ((sweep / segs) * Math.PI) / 180
  const k = (4 / 3) * Math.tan(da / 4)
  let a = (a0 * Math.PI) / 180
  let d = ''
  for (let i = 0; i < segs; i++) {
    const x0 = cx + r * Math.cos(a)
    const y0 = cy + r * Math.sin(a)
    const x3 = cx + r * Math.cos(a + da)
    const y3 = cy + r * Math.sin(a + da)
    if (i === 0) d += `M${f(x0)} ${f(y0)}`
    d += `C${f(x0 - k * r * Math.sin(a))} ${f(y0 + k * r * Math.cos(a))} ${f(x3 + k * r * Math.sin(a + da))} ${f(y3 - k * r * Math.cos(a + da))} ${f(x3)} ${f(y3)}`
    a += da
  }
  return d
}

/** Filled wave band hugging one edge (0 bottom, 90 left, 180 top, 270 right). */
export function wavePath(W: number, H: number, quarter: number, seed: number): string {
  const rnd = mulberry32(seed)
  const phase = rnd() * Math.PI * 2
  const horizontal = quarter % 2 === 0
  const L = horizontal ? W : H
  const D = horizontal ? H : W
  const periods = 2 + Math.floor(rnd() * 2)
  const base = D * 0.5
  const amp = D * 0.12
  const N = 48
  const map = (u: number, v: number): Pt =>
    quarter === 0 ? [u, H - v] : quarter === 1 ? [v, u] : quarter === 2 ? [W - u, v] : [W - v, H - u]
  const top: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const u = (L * i) / N
    top.push(map(u, base + amp * Math.sin(phase + (2 * Math.PI * periods * i) / N)))
  }
  const a = map(L, 0)
  const b = map(0, 0)
  return `M${f(top[0][0])} ${f(top[0][1])}` + top.slice(1).map((p) => `L${f(p[0])} ${f(p[1])}`).join('') + `L${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}Z`
}

/** Quarter disc in a corner (0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left). */
export function cornerPath(W: number, H: number, quarter: number): string {
  const R = Math.min(W, H) * 0.9
  const k = 0.5523 * R
  const x = (u: number) => (quarter === 1 || quarter === 2 ? W - u : u)
  const y = (v: number) => (quarter >= 2 ? H - v : v)
  return `M${f(x(0))} ${f(y(0))}L${f(x(R))} ${f(y(0))}C${f(x(R))} ${f(y(k))} ${f(x(k))} ${f(y(R))} ${f(x(0))} ${f(y(R))}Z`
}

/** A grid of small dots, all in one path. */
export function dotsPath(W: number, H: number): { d: string; count: number } {
  const gap = Math.max(20, Math.min(64, Math.min(W, H) / 8))
  const r = gap * 0.13
  const cols = Math.max(1, Math.floor((W - 2 * r) / gap) + 1)
  const rows = Math.max(1, Math.floor((H - 2 * r) / gap) + 1)
  const x0 = (W - (cols - 1) * gap) / 2
  const y0 = (H - (rows - 1) * gap) / 2
  let d = ''
  let count = 0
  for (let j = 0; j < rows && count < 600; j++) {
    for (let i = 0; i < cols && count < 600; i++) {
      const cx = x0 + i * gap
      const cy = y0 + j * gap
      d += `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)}Z`
      count++
    }
  }
  return { d, count }
}

/* ── AC4 motifs (ai-curation §2.3 rank 4) ─────────────────────────────────────────────── */

/** Closed polygon through `pts`. */
const poly = (pts: Pt[]): string => `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`

/** A `points`-pointed star of outer radius R, inner radius r·R, turned by `rotation`. */
export function starPath(cx: number, cy: number, R: number, points: number, inner: number, rotation: number): string {
  const pts: Pt[] = []
  for (let i = 0; i < points * 2; i++) {
    const th = -Math.PI / 2 + (Math.PI * i) / points
    const r = i % 2 === 0 ? R : R * inner
    pts.push(rot([cx + r * Math.cos(th), cy + r * Math.sin(th)], [cx, cy], rotation))
  }
  return poly(pts)
}

/** A four-point sparkle: concave curves between the tips (a twinkle). */
export function sparklePath(cx: number, cy: number, R: number, rotation: number): string {
  const tips: Pt[] = [0, 1, 2, 3].map((i) => rot([cx + R * Math.cos((Math.PI / 2) * i - Math.PI / 2), cy + R * Math.sin((Math.PI / 2) * i - Math.PI / 2)], [cx, cy], rotation))
  const c: Pt = [cx, cy]
  const k = 0.18
  let d = `M${f(tips[0][0])} ${f(tips[0][1])}`
  for (let i = 0; i < 4; i++) {
    const a = tips[i]
    const b = tips[(i + 1) % 4]
    // both control points pulled toward the centre: a pinched, concave edge
    const c1: Pt = [c[0] + (a[0] - c[0]) * k, c[1] + (a[1] - c[1]) * k]
    const c2: Pt = [c[0] + (b[0] - c[0]) * k, c[1] + (b[1] - c[1]) * k]
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(b[0])} ${f(b[1])}`
  }
  return d + 'Z'
}

/** Map (u along the long axis, v across) to the box for a quarter turn (0/2 horizontal, 1/3 vertical). */
const axisMap = (W: number, H: number, quarter: number) => {
  const horizontal = quarter % 2 === 0
  const L = horizontal ? W : H
  const D = horizontal ? H : W
  const map = (u: number, v: number): Pt => (quarter === 0 ? [u, v] : quarter === 1 ? [D - v, u] : quarter === 2 ? [L - u, D - v] : [v, L - u])
  return { L, D, map }
}

/** An open hand-drawn-looking wavy stroke along the long axis (sine through cubic segments). */
export function squigglePath(W: number, H: number, quarter: number, stroke: number): string {
  const { L, D, map } = axisMap(W, H, quarter)
  const m = stroke / 2 + 1
  const periods = Math.max(2, Math.round(L / Math.max(1, D) / 1.2))
  const amp = Math.max(0, Math.min(D / 2 - m, (L - 2 * m) / periods / 3))
  const step = (L - 2 * m) / (periods * 2)
  const mid = D / 2
  let d = ''
  for (let i = 0; i <= periods * 2; i++) {
    const u = m + i * step
    const v = mid + (i % 2 === 0 ? -amp : amp)
    const p = map(u, v)
    if (i === 0) d += `M${f(p[0])} ${f(p[1])}`
    else {
      const pu = m + (i - 1) * step
      const pv = mid + ((i - 1) % 2 === 0 ? -amp : amp)
      const c1 = map(pu + step / 2, pv)
      const c2 = map(u - step / 2, v)
      d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p[0])} ${f(p[1])}`
    }
  }
  return d
}

/** An open zigzag stroke along the long axis. */
export function zigzagPath(W: number, H: number, quarter: number, stroke: number): string {
  const { L, D, map } = axisMap(W, H, quarter)
  const m = stroke + 1
  // a band of small teeth (rick-rack), not a letter: teeth about as wide as the band is tall
  const teeth = Math.max(4, Math.round((L / Math.max(1, D)) * 3))
  const amp = Math.max(0, Math.min(D / 2 - m, ((L - 2 * m) / (teeth * 2)) * 0.9))
  const pts: Pt[] = []
  for (let i = 0; i <= teeth * 2; i++) pts.push(map(m + ((L - 2 * m) * i) / (teeth * 2), D / 2 + (i % 2 === 0 ? amp : -amp)))
  return `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}`
}

/** A filled half disc, flat side down for quarter 0 (1 left, 2 top, 3 right), centred in the box. */
export function halfCirclePath(W: number, H: number, quarter: number): string {
  // R: half the edge it sits on, and no taller than the box across it
  const R = Math.min(quarter % 2 === 0 ? W / 2 : H / 2, quarter % 2 === 0 ? H : W) * 0.96
  const k = 0.5523 * R
  const cx = W / 2
  const cy = H / 2
  // x in [-R, R] along the flat side, y in [0, R] from the flat side toward the apex; centred
  const pt = (x: number, y: number): Pt => {
    if (quarter === 0) return [cx + x, (H + R) / 2 - y]
    if (quarter === 1) return [(W - R) / 2 + y, cy + x]
    if (quarter === 2) return [cx - x, (H - R) / 2 + y]
    return [(W + R) / 2 - y, cy - x]
  }
  const A = pt(-R, 0)
  const B = pt(R, 0)
  const C1 = pt(-R, k)
  const C2 = pt(-k, R)
  const T = pt(0, R)
  const C3 = pt(k, R)
  const C4 = pt(R, k)
  return `M${f(A[0])} ${f(A[1])}C${f(C1[0])} ${f(C1[1])} ${f(C2[0])} ${f(C2[1])} ${f(T[0])} ${f(T[1])}C${f(C3[0])} ${f(C3[1])} ${f(C4[0])} ${f(C4[1])} ${f(B[0])} ${f(B[1])}Z`
}

/** Four corner brackets (an L in each corner), inset by half the stroke. */
export function framePath(W: number, H: number, stroke: number): string {
  const m = stroke / 2
  const a = Math.min(W, H) * 0.28
  const c: Array<[Pt, Pt, Pt]> = [
    [[m, m + a], [m, m], [m + a, m]],
    [[W - m - a, m], [W - m, m], [W - m, m + a]],
    [[W - m, H - m - a], [W - m, H - m], [W - m - a, H - m]],
    [[m + a, H - m], [m, H - m], [m, H - m - a]],
  ]
  return c.map(([p, q, r]) => `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}L${f(r[0])} ${f(r[1])}`).join('')
}

/** An equilateral triangle in the circle of radius 0.9 R, point up at rotation 0. */
export function trianglePath(c: Pt, R: number, rotation: number): string {
  const r = R * 0.9
  const pts: Pt[] = [0, 1, 2].map((i) => rot([c[0] + r * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / 3), c[1] + r * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / 3)], c, rotation))
  return poly(pts)
}

/**
 * The `orb` motif: a pseudo-3D sphere (ai-curation §3.1, "3D" merged into `gradient`) — one square
 * rect, fully rounded, filled with a radial gradient lit from the top left (light tint → the colour
 * → a darker rim). A rect, not a path: both renderers draw gradient rects (a DOM path cannot take a
 * gradient fill). The opacity is at least 0.85: an orb at 20 % reads as a stain, not a sphere.
 */
function orbNode(W: number, H: number, color: string, alpha: number | undefined): LayoutNode {
  const S = Math.min(W, H) * 0.96
  const box = { x: (W - S) / 2, y: (H - S) / 2, width: S, height: S }
  const light = tintOf(color, '#ffffff', 0.55)
  const dark = tintOf(color, '#000000', 0.35)
  const node: LayoutNode = {
    k: 'rect',
    part: 'shape',
    box,
    radius: S / 2,
    fill: { type: 'radialGradient', cx: 0.36, cy: 0.3, stops: [{ color: light, at: 0 }, { color, at: 0.55 }, { color: dark, at: 1 }] },
  }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, ...(alpha === undefined ? {} : { opacity: alpha }), children: [node] }
}

const OPACITY = { soft: 0.2, medium: 0.4, strong: 0.7 } as const

export function layout(props: DecorationProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const shape = enumOf(props.shape, DECORATION_SHAPES, 'blob')
  const tone = enumOf(props.tone, ['accent', 'accent2', 'alt', 'line'] as const, 'accent')
  const op = enumOf(props.opacity, ['soft', 'medium', 'strong'] as const, 'soft')
  const rotation = typeof props.rotation === 'number' && Number.isFinite(props.rotation) ? ((props.rotation % 360) + 360) % 360 : 0
  const seed = typeof props.seed === 'number' && Number.isFinite(props.seed) ? props.seed : 1
  const quarter = Math.round(rotation / 90) % 4
  const color =
    tone === 'alt' ? ctx.resolveColor('surfaceAlt').color : tone === 'line' ? tintOf(ctx.resolveColor('surface').color, ctx.resolveColor('line').color, 0.9) : ctx.resolveColor(tone).color
  const c: Pt = [W / 2, H / 2]
  const R = Math.min(W, H) / 2
  let d = ''
  let stroke: number | undefined
  if (R < 1) d = ''
  else if (shape === 'blob') d = blobPath(c[0], c[1], R, seed, rotation)
  else if (shape === 'arc') {
    stroke = Math.max(2, R * 0.2)
    d = arcPath(c[0], c[1], Math.max(1, R - stroke / 2 - R * 0.06), rotation, 160)
  } else if (shape === 'ring') {
    stroke = Math.max(2, R * 0.16)
    d = arcPath(c[0], c[1], Math.max(1, R - stroke / 2 - R * 0.04), 0, 360) + 'Z'
  } else if (shape === 'wave') d = wavePath(W, H, quarter, seed)
  else if (shape === 'corner') d = cornerPath(W, H, quarter)
  else if (shape === 'orb') return orbNode(W, H, color, tone === 'alt' ? undefined : Math.max(0.85, OPACITY[op]))
  else if (shape === 'star') d = starPath(c[0], c[1], R * 0.92, 5, 0.45, rotation)
  else if (shape === 'sparkle') d = sparklePath(c[0], c[1], R * 0.92, rotation)
  else if (shape === 'triangle') d = trianglePath(c, R, rotation)
  else if (shape === 'half-circle') d = halfCirclePath(W, H, quarter)
  else if (shape === 'squiggle') {
    stroke = Math.max(2, Math.min(W, H) * 0.14)
    d = squigglePath(W, H, quarter, stroke)
  } else if (shape === 'zigzag') {
    stroke = Math.max(2, Math.min(W, H) * 0.12)
    d = zigzagPath(W, H, quarter, stroke)
  } else if (shape === 'frame') {
    stroke = Math.max(2, Math.min(W, H) * 0.025)
    d = framePath(W, H, stroke)
  } else d = dotsPath(W, H).d
  // AC5: the hand-drawn motifs are Rough.js sketches of their paths: the squiggle a wobbly double
  // pen stroke, the star and sparkle a solid shape with a hand-cut (wobbly) edge
  if (d && shape === 'squiggle') {
    const leaves = roughPaths(d, W, H, { seed, stroke: { color, width: stroke! * 0.75 }, margin: stroke! * 0.5 + 2, roughness: 1.1 })
    return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, ...(tone === 'alt' ? {} : { opacity: OPACITY[op] }), children: leaves }
  }
  if (d && (shape === 'star' || shape === 'sparkle')) d = roughOutline(d, W, H, { seed, margin: 1, roughness: shape === 'star' ? 1.3 : 0.9 })
  const node: LayoutNode = {
    k: 'path',
    part: 'shape',
    box: { x: 0, y: 0, width: W, height: H },
    d: d || 'M0 0',
    ...(stroke === undefined ? { fill: { type: 'solid', color } as const } : { stroke: { color, width: stroke } }),
  }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, ...(tone === 'alt' ? {} : { opacity: OPACITY[op] }), children: [node] }
}
