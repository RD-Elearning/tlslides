/**
 * spro enhance PLAN.md S4 — isometric solids for `tls.m.decoration`: cube, cylinder, cone,
 * pyramid and slab, drawn as faces in three tints of one colour (lit top, the colour, a shaded
 * side) with a separate ink outline. Absolute M/L/C/Z commands only (no arcs), so the deck's render
 * treatment can sketch the outline by hand (doodle) and both renderers draw the same paths.
 *
 * Pure and DOM-free.
 */
import type { LayoutNode, Paint } from '../../../types'
import { tintOf } from '../_kit'

export const SOLID_SHAPES = ['cube', 'cylinder', 'cone', 'pyramid', 'slab'] as const
export type SolidShape = (typeof SOLID_SHAPES)[number]

type P = [number, number]
const f = (v: number) => String(Math.round(v * 100) / 100)
const poly = (pts: P[]) => `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')} Z`
const K = 0.5523 // cubic Bézier circle constant

/** Half an ellipse (cx, cy, rx, ry) from the left end to the right end, through the bottom (or top). */
function halfEllipse(cx: number, cy: number, rx: number, ry: number, bottom: boolean): string {
  const s = bottom ? 1 : -1
  return (
    `C${f(cx - rx)} ${f(cy + s * ry * K)} ${f(cx - rx * K)} ${f(cy + s * ry)} ${f(cx)} ${f(cy + s * ry)} ` +
    `C${f(cx + rx * K)} ${f(cy + s * ry)} ${f(cx + rx)} ${f(cy + s * ry * K)} ${f(cx + rx)} ${f(cy)}`
  )
}
/** A full ellipse: the lower half left → right, the upper half right → left. */
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${f(cx - rx)} ${f(cy)} ${halfEllipse(cx, cy, rx, ry, true)} ` +
  `C${f(cx + rx)} ${f(cy - ry * K)} ${f(cx + rx * K)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)} ` +
  `C${f(cx - rx * K)} ${f(cy - ry)} ${f(cx - rx)} ${f(cy - ry * K)} ${f(cx - rx)} ${f(cy)} Z`

interface Faces {
  faces: Array<{ d: string; tone: 'light' | 'base' | 'dark' }>
  edges: string[]
}

function cube(W: number, H: number, flat = false): Faces {
  // an isometric box whose width is 2a and whose height is 2h + e (h = a·tan30, e the vertical edge)
  const ratio = flat ? 0.45 : 1.155 // vertical edge / a
  const a = Math.min(W / 2, H / (2 * Math.tan(Math.PI / 6) + ratio)) * 0.94
  const h = a * Math.tan(Math.PI / 6)
  const e = a * ratio
  const cx = W / 2
  const y0 = (H - (2 * h + e)) / 2
  const T: P = [cx, y0]
  const UR: P = [cx + a, y0 + h]
  const UL: P = [cx - a, y0 + h]
  const C: P = [cx, y0 + 2 * h]
  const LR: P = [cx + a, y0 + h + e]
  const LL: P = [cx - a, y0 + h + e]
  const B: P = [cx, y0 + 2 * h + e]
  return {
    faces: [
      { d: poly([T, UR, C, UL]), tone: 'light' },
      { d: poly([UL, C, B, LL]), tone: 'base' },
      { d: poly([C, UR, LR, B]), tone: 'dark' },
    ],
    edges: [poly([T, UR, LR, B, LL, UL]), `M${f(UL[0])} ${f(UL[1])} L${f(C[0])} ${f(C[1])} L${f(UR[0])} ${f(UR[1])} M${f(C[0])} ${f(C[1])} L${f(B[0])} ${f(B[1])}`],
  }
}

function cylinder(W: number, H: number): Faces {
  const rx = Math.min(W / 2, H * 0.4) * 0.94
  const ry = rx * 0.34
  const body = Math.min(H - 2 * ry, rx * 1.6) * 0.96
  const cx = W / 2
  const top = (H - (body + 2 * ry)) / 2 + ry
  const bottom = top + body
  const side = `M${f(cx - rx)} ${f(top)} L${f(cx - rx)} ${f(bottom)} ${halfEllipse(cx, bottom, rx, ry, true)} L${f(cx + rx)} ${f(top)} Z`
  const shade = `M${f(cx + rx * 0.35)} ${f(top + ry * 0.94)} L${f(cx + rx * 0.35)} ${f(bottom + ry * 0.94)} C${f(cx + rx * 0.7)} ${f(bottom + ry * 0.75)} ${f(cx + rx)} ${f(bottom + ry * K)} ${f(cx + rx)} ${f(bottom)} L${f(cx + rx)} ${f(top)} C${f(cx + rx)} ${f(top + ry * K)} ${f(cx + rx * 0.7)} ${f(top + ry * 0.75)} ${f(cx + rx * 0.35)} ${f(top + ry * 0.94)} Z`
  return {
    faces: [
      { d: side, tone: 'base' },
      { d: shade, tone: 'dark' },
      { d: ellipse(cx, top, rx, ry), tone: 'light' },
    ],
    edges: [
      ellipse(cx, top, rx, ry),
      `M${f(cx - rx)} ${f(top)} L${f(cx - rx)} ${f(bottom)} ${halfEllipse(cx, bottom, rx, ry, true)} L${f(cx + rx)} ${f(top)}`,
    ],
  }
}

function cone(W: number, H: number): Faces {
  const rx = Math.min(W / 2, H * 0.42) * 0.94
  const ry = rx * 0.34
  const tall = Math.min(H - ry, rx * 2.1) * 0.95
  const cx = W / 2
  const apexY = (H - (tall + ry)) / 2
  const baseY = apexY + tall
  const body = `M${f(cx)} ${f(apexY)} L${f(cx - rx)} ${f(baseY)} ${halfEllipse(cx, baseY, rx, ry, true)} Z`
  const shade = `M${f(cx)} ${f(apexY)} L${f(cx + rx * 0.2)} ${f(baseY + ry * 0.99)} C${f(cx + rx * 0.6)} ${f(baseY + ry * 0.85)} ${f(cx + rx)} ${f(baseY + ry * K)} ${f(cx + rx)} ${f(baseY)} Z`
  return {
    faces: [
      { d: body, tone: 'base' },
      { d: shade, tone: 'dark' },
    ],
    edges: [body],
  }
}

function pyramid(W: number, H: number): Faces {
  const a = Math.min(W / 2, H * 0.55) * 0.94
  const h = a * Math.tan(Math.PI / 6)
  const tall = Math.min(H - 2 * h, a * 1.5)
  const cx = W / 2
  const y0 = (H - (tall + 2 * h)) / 2
  const apex: P = [cx, y0]
  const L: P = [cx - a, y0 + tall]
  const R: P = [cx + a, y0 + tall]
  const F: P = [cx - a * 0.1, y0 + tall + h * 0.9]
  return {
    faces: [
      { d: poly([apex, L, F]), tone: 'base' },
      { d: poly([apex, F, R]), tone: 'dark' },
    ],
    edges: [poly([apex, L, F, R]), `M${f(apex[0])} ${f(apex[1])} L${f(F[0])} ${f(F[1])}`],
  }
}

/** The solid as a group of box-local paths: faces (fill) under the ink outline (stroke). */
export function solidNode(shape: SolidShape, W: number, H: number, color: string, ink: string, alpha?: number): LayoutNode {
  const g = shape === 'cube' ? cube(W, H) : shape === 'slab' ? cube(W, H, true) : shape === 'cylinder' ? cylinder(W, H) : shape === 'cone' ? cone(W, H) : pyramid(W, H)
  const tint: Record<'light' | 'base' | 'dark', string> = { light: tintOf(color, '#ffffff', 0.45), base: color, dark: tintOf(color, '#000000', 0.22) }
  const box = { x: 0, y: 0, width: W, height: H }
  const width = Math.max(2, Math.min(W, H) * 0.018)
  const children: LayoutNode[] = [
    ...g.faces.map((x): LayoutNode => ({ k: 'path', part: 'face', box, d: x.d, fill: { type: 'solid', color: tint[x.tone] } as Paint })),
    ...g.edges.map((d): LayoutNode => ({ k: 'path', part: 'edge', box, d, stroke: { color: ink, width } })),
  ]
  return { k: 'group', part: 'root', box, ...(alpha === undefined ? {} : { opacity: alpha }), children }
}
