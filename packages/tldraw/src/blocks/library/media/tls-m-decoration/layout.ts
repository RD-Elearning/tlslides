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
import type { DecorationProps } from './schema'
import { enumOf, side, tintOf } from '../_kit'

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

const OPACITY = { soft: 0.2, medium: 0.4, strong: 0.7 } as const

export function layout(props: DecorationProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const shape = enumOf(props.shape, ['blob', 'arc', 'ring', 'dots', 'wave', 'corner'] as const, 'blob')
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
  else d = dotsPath(W, H).d
  const node: LayoutNode = {
    k: 'path',
    part: 'shape',
    box: { x: 0, y: 0, width: W, height: H },
    d: d || 'M0 0',
    ...(stroke === undefined ? { fill: { type: 'solid', color } as const } : { stroke: { color, width: stroke } }),
  }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, ...(tone === 'alt' ? {} : { opacity: OPACITY[op] }), children: [node] }
}
