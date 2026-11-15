/**
 * spro sprint 2026-11b S09-B — geometry shared by the wave-B diagrams (concept map, cycle detail,
 * cause chain): where a line leaves a box, sampled paths, clearance between a label and every line,
 * and the label placement that keeps link labels in the gaps (never on a node, ≥ 8 units from lines).
 */
import type { Box } from '../../types'

export type Pt = { x: number; y: number }

/** Where the ray from the centre of `b` towards `to` crosses `b`'s edge, pushed out by `gap`. */
export function edgePoint(b: Box, to: Pt, gap = 0): Pt {
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  const dx = to.x - cx
  const dy = to.y - cy
  if (!dx && !dy) return { x: cx, y: cy }
  const sx = dx ? (b.width / 2 + gap) / Math.abs(dx) : Infinity
  const sy = dy ? (b.height / 2 + gap) / Math.abs(dy) : Infinity
  const s = Math.min(sx, sy)
  return { x: cx + dx * s, y: cy + dy * s }
}

/** A quadratic curve from `a` to `b` bent by `bend` × length to the left of a→b (0 = straight). */
export function curve(a: Pt, b: Pt, bend: number): { d: string; points: Pt[]; at: (t: number) => Pt; tangent: (t: number) => Pt } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const c = { x: (a.x + b.x) / 2 - dy * bend, y: (a.y + b.y) / 2 + dx * bend }
  const at = (t: number): Pt => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y })
  const tangent = (t: number): Pt => {
    const x = 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x)
    const y = 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y)
    const l = Math.hypot(x, y) || 1
    return { x: x / l, y: y / l }
  }
  const len = Math.hypot(dx, dy)
  const n = Math.max(2, Math.ceil(len / 6))
  const points = Array.from({ length: n + 1 }, (_, i) => at(i / n))
  const f = (v: number) => String(Math.round(v * 100) / 100)
  const d = bend ? `M${f(a.x)} ${f(a.y)}Q${f(c.x)} ${f(c.y)} ${f(b.x)} ${f(b.y)}` : `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`
  return { d, points, at, tangent }
}

/** Distance from point `p` to box `b` (0 inside). */
export function distToBox(p: Pt, b: Box): number {
  const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.width))
  const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.height))
  return Math.hypot(dx, dy)
}

/** The smallest distance between a box and sampled points (Infinity for none). */
export function clearance(b: Box, points: Pt[]): number {
  let m = Infinity
  for (const p of points) m = Math.min(m, distToBox(p, b))
  return m
}

export function boxesOverlap(a: Box, b: Box, pad = 0): boolean {
  return a.x < b.x + b.width + pad && b.x < a.x + a.width + pad && a.y < b.y + b.height + pad && b.y < a.y + a.height + pad
}

/**
 * A place for a label of size `w`×`h` beside its own path (sampled by `at` / `tangent`): tries points
 * along the path and both sides, at `gap` from the line; the first spot clear of every line, node,
 * placed label and inside `area` wins, else the spot with the most clearance.
 */
export function placeLabel(
  w: number,
  h: number,
  path: { at: (t: number) => Pt; tangent: (t: number) => Pt },
  lines: Pt[][],
  blocked: Box[],
  area: Box,
  gap = 8
): { box: Box; clear: number } {
  let best: { box: Box; clear: number } | undefined
  for (const [t, extra] of [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78, 0.15, 0.85].flatMap((t) => [[t, 0], [t, gap * 2]])) {
    const p = path.at(t)
    const tg = path.tangent(t)
    const nx = -tg.y
    const ny = tg.x
    const off = gap + 1 + extra + Math.abs(nx) * (w / 2) + Math.abs(ny) * (h / 2)
    for (const s of [1, -1]) {
      const cx = p.x + nx * off * s
      const cy = p.y + ny * off * s
      const box = { x: cx - w / 2, y: cy - h / 2, width: w, height: h }
      if (box.x < area.x || box.y < area.y || box.x + box.width > area.x + area.width || box.y + box.height > area.y + area.height) continue
      if (blocked.some((b) => boxesOverlap(box, b, 4))) continue
      const clear = Math.min(...lines.map((l) => clearance(box, l)))
      if (clear >= gap) return { box, clear }
      if (!best || clear > best.clear) best = { box, clear }
    }
  }
  if (best) return best
  const p = path.at(0.5)
  return { box: { x: p.x - w / 2, y: p.y - h / 2, width: w, height: h }, clear: 0 }
}
