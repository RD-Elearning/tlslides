/**
 * spro enhance PLAN.md S4 — subject doodles for `tls.m.decoration`: small drawings that belong to
 * the deck's topic (a tree for a data-structures chapter, a flask for chemistry) where the generic
 * stars and cubes said nothing. Each is a few filled shapes in a light tint of the colour under an
 * ink outline in the colour, drawn in a square centred in the box. Absolute M/L/C/Z commands only
 * (no arcs), so the deck's render treatment sketches them by hand (doodle) and both renderers draw
 * the same paths.
 *
 * Pure and DOM-free.
 */
import type { LayoutNode, Paint } from '../../../types'
import { tintOf } from '../_kit'

export const SUBJECT_SHAPES = ['tree', 'graph', 'gear', 'book', 'flask', 'globe', 'bulb', 'chart', 'code'] as const
export type SubjectShape = (typeof SUBJECT_SHAPES)[number]

type P = [number, number]
const K = 0.5523 // cubic Bézier circle constant

/** A drawing in a 100 × 100 square: `under` (ink drawn first: a network's edges), `fills` (tinted
 *  shapes), then `lines` (the ink on top). */
interface Drawing {
  under?: string[]
  fills: string[]
  lines: string[]
}

/** Coordinates in the 100-unit square → the box, through `t`. */
type T = (x: number, y: number) => string

function circle(t: T, cx: number, cy: number, r: number): string {
  return (
    `M${t(cx - r, cy)} C${t(cx - r, cy + r * K)} ${t(cx - r * K, cy + r)} ${t(cx, cy + r)} ` +
    `C${t(cx + r * K, cy + r)} ${t(cx + r, cy + r * K)} ${t(cx + r, cy)} ` +
    `C${t(cx + r, cy - r * K)} ${t(cx + r * K, cy - r)} ${t(cx, cy - r)} ` +
    `C${t(cx - r * K, cy - r)} ${t(cx - r, cy - r * K)} ${t(cx - r, cy)} Z`
  )
}

function ellipse(t: T, cx: number, cy: number, rx: number, ry: number): string {
  return (
    `M${t(cx - rx, cy)} C${t(cx - rx, cy + ry * K)} ${t(cx - rx * K, cy + ry)} ${t(cx, cy + ry)} ` +
    `C${t(cx + rx * K, cy + ry)} ${t(cx + rx, cy + ry * K)} ${t(cx + rx, cy)} ` +
    `C${t(cx + rx, cy - ry * K)} ${t(cx + rx * K, cy - ry)} ${t(cx, cy - ry)} ` +
    `C${t(cx - rx * K, cy - ry)} ${t(cx - rx, cy - ry * K)} ${t(cx - rx, cy)} Z`
  )
}

const poly = (t: T, pts: P[], close = true) => `M${pts.map((p) => t(p[0], p[1])).join(' L')}${close ? ' Z' : ''}`
const line = (t: T, a: P, b: P) => `M${t(a[0], a[1])} L${t(b[0], b[1])}`

/** Nodes over the edges that join them: a tree or a graph. */
function network(t: T, nodes: P[], edges: Array<[number, number]>, r: number): Drawing {
  return {
    under: edges.map(([a, b]) => line(t, nodes[a], nodes[b])),
    fills: nodes.map(([x, y]) => circle(t, x, y, r)),
    lines: nodes.map(([x, y]) => circle(t, x, y, r)),
  }
}

const DRAW: Record<SubjectShape, (t: T) => Drawing> = {
  tree: (t) =>
    network(t, [[50, 14], [27, 46], [73, 46], [14, 82], [38, 82], [62, 82], [86, 82]], [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]], 9),
  graph: (t) =>
    network(t, [[22, 24], [74, 16], [86, 60], [48, 86], [14, 66], [50, 48]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 5], [5, 2], [5, 3]], 8),
  gear: (t) => {
    const pts: P[] = []
    for (let i = 0; i < 32; i++) {
      // eight teeth: two points out, two in, per tooth
      const a = (i / 32) * Math.PI * 2
      const r = i % 4 < 2 ? 44 : 34
      pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)])
    }
    const rim = poly(t, pts)
    return { fills: [rim], lines: [rim, circle(t, 50, 50, 13)] }
  },
  book: (t) => {
    const left = `M${t(50, 26)} C${t(38, 18)} ${t(22, 18)} ${t(8, 24)} L${t(8, 80)} C${t(22, 74)} ${t(38, 74)} ${t(50, 82)} Z`
    const right = `M${t(50, 26)} C${t(62, 18)} ${t(78, 18)} ${t(92, 24)} L${t(92, 80)} C${t(78, 74)} ${t(62, 74)} ${t(50, 82)} Z`
    const rule = (x0: number, x1: number, y: number) => line(t, [x0, y], [x1, y])
    return { fills: [left, right], lines: [left, right, rule(16, 42, 38), rule(16, 42, 50), rule(16, 36, 62), rule(58, 84, 38), rule(58, 84, 50), rule(58, 78, 62)] }
  },
  flask: (t) => {
    const body = poly(t, [[40, 10], [60, 10], [60, 38], [86, 88], [14, 88], [40, 38]])
    const liquid = poly(t, [[27, 64], [73, 64], [86, 88], [14, 88]])
    return { fills: [liquid], lines: [body, line(t, [34, 10], [66, 10]), line(t, [27, 64], [73, 64]), circle(t, 44, 76, 4), circle(t, 58, 72, 3)] }
  },
  globe: (t) => {
    const ball = circle(t, 50, 50, 40)
    return {
      fills: [ball],
      lines: [ball, ellipse(t, 50, 50, 17, 40), line(t, [10, 50], [90, 50]), `M${t(16, 30)} C${t(36, 38)} ${t(64, 38)} ${t(84, 30)}`, `M${t(16, 70)} C${t(36, 62)} ${t(64, 62)} ${t(84, 70)}`],
    }
  },
  bulb: (t) => {
    const glass = `M${t(38, 66)} C${t(38, 56)} ${t(20, 50)} ${t(20, 36)} C${t(20, 19)} ${t(34, 8)} ${t(50, 8)} C${t(66, 8)} ${t(80, 19)} ${t(80, 36)} C${t(80, 50)} ${t(62, 56)} ${t(62, 66)} Z`
    const base = poly(t, [[38, 70], [62, 70], [62, 84], [56, 92], [44, 92], [38, 84]])
    return {
      fills: [glass],
      lines: [glass, base, line(t, [38, 77], [62, 77]), `M${t(43, 66)} L${t(43, 46)} L${t(50, 40)} L${t(57, 46)} L${t(57, 66)}`],
    }
  },
  chart: (t) => {
    const bars = [poly(t, [[22, 62], [34, 62], [34, 86], [22, 86]]), poly(t, [[44, 44], [56, 44], [56, 86], [44, 86]]), poly(t, [[66, 26], [78, 26], [78, 86], [66, 86]])]
    return { fills: bars, lines: [...bars, poly(t, [[10, 8], [10, 86], [92, 86]], false), poly(t, [[16, 50], [40, 34], [60, 22], [86, 10]], false)] }
  },
  code: (t) => {
    const chip = poly(t, [[6, 20], [94, 20], [94, 80], [6, 80]])
    return {
      fills: [chip],
      lines: [chip, poly(t, [[34, 34], [18, 50], [34, 66]], false), poly(t, [[66, 34], [82, 50], [66, 66]], false), line(t, [56, 30], [44, 70])],
    }
  },
}

/** The doodle as a group of box-local paths: tinted fills under the outline in `color`. */
export function subjectNode(shape: SubjectShape, W: number, H: number, color: string, surface: string, alpha?: number): LayoutNode {
  const s = Math.min(W, H) * 0.94
  const x0 = (W - s) / 2
  const y0 = (H - s) / 2
  const r = (v: number) => String(Math.round(v * 100) / 100)
  const t: T = (x, y) => `${r(x0 + (x / 100) * s)} ${r(y0 + (y / 100) * s)}`
  const g = DRAW[shape](t)
  const box = { x: 0, y: 0, width: W, height: H }
  const width = Math.max(2, s * 0.035)
  const fill = tintOf(surface, color, 0.28)
  const ink = (d: string): LayoutNode => ({ k: 'path', part: 'edge', box, d, stroke: { color, width } })
  const children: LayoutNode[] = [
    ...(g.under ?? []).map(ink),
    ...g.fills.map((d): LayoutNode => ({ k: 'path', part: 'face', box, d, fill: { type: 'solid', color: fill } as Paint })),
    ...g.lines.map(ink),
  ]
  return { k: 'group', part: 'root', box, ...(alpha === undefined ? {} : { opacity: alpha }), children }
}
