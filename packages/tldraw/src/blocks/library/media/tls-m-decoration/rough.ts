/**
 * AC5 — hand-drawn motifs through Rough.js (ai-curation §4.2; spike passed in AC4, adopted with
 * `doodle`). The squiggle, star and sparkle motifs are drawn as Rough.js sketches of their smooth
 * paths: a wobbly double stroke, and for the closed shapes a hachure (pen-hatched) fill.
 *
 * Only the generator is used (`rough.generator()`, no DOM), with a fixed `seed`, so the same props
 * always give the same path data. `toPaths()` emits absolute `M`/`L`/`C` commands only. The result
 * is fitted into the box (a uniform scale about the box centre when a stroke's wobble would spill
 * out), because the DOM renderer clips a path to its box and the SVG renderer does not.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */
import rough from 'roughjs'
import type { LayoutNode } from '../../../types'

/** `rough.generator()` once; it holds no per-call state (the seed is an option per shape). */
let gen: ReturnType<typeof rough.generator> | undefined
const generator = () => (gen ??= rough.generator())

const r2 = (v: number) => Math.round(v * 100) / 100
const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi

/** Every coordinate of an absolute M/L/C path, as [x, y] pairs. */
function points(d: string): number[] {
  return (d.match(NUM) ?? []).map(Number)
}

/** The control-point hull of a list of paths (a superset of the curve's bounds). */
function hull(ds: string[]): { x1: number; y1: number; x2: number; y2: number } | undefined {
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (const d of ds) {
    const p = points(d)
    for (let i = 0; i + 1 < p.length; i += 2) {
      x1 = Math.min(x1, p[i])
      x2 = Math.max(x2, p[i])
      y1 = Math.min(y1, p[i + 1])
      y2 = Math.max(y2, p[i + 1])
    }
  }
  return Number.isFinite(x1) ? { x1, y1, x2, y2 } : undefined
}

/** Applies `x' = cx + (x - cx) k` (same for y) to every coordinate pair, keeping the commands. */
function scaleAbout(d: string, cx: number, cy: number, k: number): string {
  let i = 0
  return d.replace(NUM, (m) => {
    const v = Number(m)
    const out = i % 2 === 0 ? cx + (v - cx) * k : cy + (v - cy) * k
    i++
    return String(r2(out))
  })
}

export interface RoughOptions {
  seed: number
  /** Stroke colour and width; omitted = no outline. */
  stroke?: { color: string; width: number }
  /** Hachure fill colour, gap and line weight; omitted = no fill. */
  hachure?: { color: string; gap: number; weight: number }
  roughness?: number
  /** Half the outer stroke (and the wobble) kept inside the box. */
  margin: number
}

/**
 * A Rough.js sketch of the absolute path `d` (in box coordinates) as `path` leaves, fitted into
 * the W × H box less `margin`. Fill leaves come first (under the outline).
 */
export function roughPaths(d: string, W: number, H: number, o: RoughOptions): LayoutNode[] {
  const g = generator()
  const seed = Math.max(1, Math.floor(o.seed) || 1)
  const base = { seed, roughness: o.roughness ?? 1.3, bowing: 1 }
  // fill and outline drawn separately, so each set is known without guessing from its colour
  const fill = o.hachure
    ? g.toPaths(g.path(d, { ...base, stroke: 'none', strokeWidth: 0, fill: '#000', fillStyle: 'hachure', hachureGap: o.hachure.gap, fillWeight: o.hachure.weight, hachureAngle: -41 })).filter((s) => s.stroke !== 'none')
    : []
  const line = o.stroke ? g.toPaths(g.path(d, { ...base, stroke: '#000', strokeWidth: o.stroke.width })).filter((s) => s.stroke !== 'none') : []
  // fit: scale the whole sketch about the box centre when it spills past the margin
  const h = hull([...fill, ...line].map((s) => s.d))
  const cx = W / 2
  const cy = H / 2
  let k = 1
  if (h) {
    const m = o.margin
    const fits = (v: number, lo: number, hi: number, c: number) => (v < lo ? (c - lo) / Math.max(1e-6, c - v) : v > hi ? (hi - c) / Math.max(1e-6, v - c) : 1)
    k = Math.max(0, Math.min(1, fits(h.x1, m, W - m, cx), fits(h.x2, m, W - m, cx), fits(h.y1, m, H - m, cy), fits(h.y2, m, H - m, cy)))
  }
  const fix = (dd: string) => (k < 1 ? scaleAbout(dd, cx, cy, k) : dd.replace(NUM, (m) => String(r2(Number(m)))))
  const leaf = (dd: string, color: string, width: number): LayoutNode => ({ k: 'path', part: 'shape', box: { x: 0, y: 0, width: W, height: H }, d: fix(dd), stroke: { color, width } })
  return [...fill.map((s) => leaf(s.d, o.hachure!.color, o.hachure!.weight)), ...line.map((s) => leaf(s.d, o.stroke!.color, o.stroke!.width))]
}

/**
 * A single wobbly outline of the closed path `d` (one pass, no double stroke), fitted into the box
 * less `margin`: the edge of a hand-cut shape, painted as that shape's solid fill.
 */
export function roughOutline(d: string, W: number, H: number, o: { seed: number; roughness?: number; margin: number }): string {
  const g = generator()
  const sets = g.toPaths(g.path(d, { seed: Math.max(1, Math.floor(o.seed) || 1), roughness: o.roughness ?? 1.2, bowing: 1, stroke: '#000', strokeWidth: 1, disableMultiStroke: true }))
  // Rough.js draws each edge as its own `M … C …` piece; one closed outline needs them joined:
  // every later `M` becomes an `L` (the jump is the wobble's few units), then `Z`.
  let first = true
  const dd = sets.map((x) => x.d).join(' ').replace(/M/g, () => (first ? ((first = false), 'M') : 'L')) + 'Z'
  const h = hull([dd])
  const cx = W / 2
  const cy = H / 2
  let k = 1
  if (h) {
    const m = o.margin
    const fits = (v: number, lo: number, hi: number, c: number) => (v < lo ? (c - lo) / Math.max(1e-6, c - v) : v > hi ? (hi - c) / Math.max(1e-6, v - c) : 1)
    k = Math.max(0, Math.min(1, fits(h.x1, m, W - m, cx), fits(h.x2, m, W - m, cx), fits(h.y1, m, H - m, cy), fits(h.y2, m, H - m, cy)))
  }
  return k < 1 ? scaleAbout(dd, cx, cy, k) : dd.replace(NUM, (x) => String(r2(Number(x))))
}
