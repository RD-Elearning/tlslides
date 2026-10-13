/**
 * spro enhance PLAN.md S2 — the render treatment: how a style *draws* what the layout placed.
 * Applied to a block's laid-out tree just before it is painted (editor, viewer, SVG export), never
 * to the geometry the oracle measures: every node keeps its box, only its paint changes.
 *
 * - `stroke: 'rough'` — rect borders, solid lines without a marker and stroked open paths become
 *   Rough.js sketches (a wobbly double ink line), seeded per node so a render is reproducible;
 * - `fill: 'hachure'` — a filled rect also gets a pen-hatched layer in a darker tint of its fill.
 *
 * A rect becomes a group at its box: the rect itself (fill, radius, shadow; no border) plus the
 * sketch as box-local `path` leaves — the convention both renderers paint the same way (a path's
 * `d` is local to its box, the box at the group's origin). Text, icons and images are unchanged.
 *
 * Pure and DOM-free.
 */
import { roughOutline, roughPaths } from './library/media/tls-m-decoration/rough'
import type { LayoutNode, Paint, Stroke, StyleSurface } from './types'
import { mixHex } from './color-math'

export type RenderTreatment = NonNullable<StyleSurface['render']>

/** FNV-1a of a string, for seeds. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 9973 + 1
}

const solid = (p: Paint | undefined): string | undefined => (p && p.type === 'solid' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : undefined)

/** A rounded rectangle of `w × h` at the origin as absolute M/L/C commands (Rough.js input). */
export function roundedRectPath(w: number, h: number, r: number): string {
  const k = Math.max(0, Math.min(r, w / 2, h / 2))
  if (k <= 0) return `M0 0 L${w} 0 L${w} ${h} L0 ${h} Z`
  const c = k * 0.5523
  return [
    `M${k} 0`, `L${w - k} 0`, `C${w - k + c} 0 ${w} ${k - c} ${w} ${k}`,
    `L${w} ${h - k}`, `C${w} ${h - k + c} ${w - k + c} ${h} ${w - k} ${h}`,
    `L${k} ${h}`, `C${k - c} ${h} 0 ${h - k + c} 0 ${h - k}`,
    `L0 ${k}`, `C0 ${k - c} ${k - c} 0 ${k} 0`, 'Z',
  ].join(' ')
}

const sketchable = (s: Stroke | undefined): s is Stroke => !!s && s.width > 0 && !(s.dash && s.dash.length)

function treatRect(node: Extract<LayoutNode, { k: 'rect' }>, t: RenderTreatment, seed: number): LayoutNode {
  const { width: W, height: H } = node.box
  const rough = t.stroke === 'rough' && sketchable(node.stroke)
  const fillHex = solid(node.fill)
  const hatch = t.fill === 'hachure' && !!fillHex && W >= 24 && H >= 24
  if ((!rough && !hatch) || W < 4 || H < 4) return node
  const r = typeof node.radius === 'number' ? node.radius : Array.isArray(node.radius) ? node.radius[0] : 0
  const d = roundedRectPath(W, H, r)
  const stroke = rough ? node.stroke! : undefined
  const sketch = roughPaths(d, W, H, {
    seed,
    roughness: t.roughness ?? 1,
    margin: stroke ? stroke.width / 2 + 1 : 1,
    ...(stroke ? { stroke: { color: stroke.color, width: stroke.width } } : {}),
    ...(hatch ? { hachure: { color: mixHex(fillHex!, '#000000', 0.12), gap: 14, weight: 1.5 } } : {}),
  })
  // the fill follows the hand-drawn edge (one wobbly outline), so no crisp corner shows past the
  // ink; a shadowed panel keeps its rect (the shadow is a rect effect)
  const local = { x: 0, y: 0, width: W, height: H }
  const base: LayoutNode =
    rough && node.fill && !node.shadow
      ? { k: 'path', box: local, d: roughOutline(d, W, H, { seed, roughness: (t.roughness ?? 1) * 0.6, margin: stroke!.width / 2 + 1 }), fill: node.fill, ...(node.part ? { part: node.part } : {}) }
      : { k: 'rect', box: local, ...(node.fill ? { fill: node.fill } : {}), ...(node.radius !== undefined ? { radius: node.radius } : {}), ...(node.shadow ? { shadow: node.shadow } : {}), ...(node.part ? { part: node.part } : {}) }
  return { k: 'group', box: node.box, ...(node.part ? { part: node.part } : {}), children: [base, ...sketch] }
}

function treatLine(node: Extract<LayoutNode, { k: 'line' }>, t: RenderTreatment, seed: number): LayoutNode {
  if (t.stroke !== 'rough' || node.marker || !sketchable(node.stroke)) return node
  const pad = node.stroke.width + 6
  const x0 = Math.min(node.from.x, node.to.x) - pad
  const y0 = Math.min(node.from.y, node.to.y) - pad
  const W = Math.abs(node.to.x - node.from.x) + 2 * pad
  const H = Math.abs(node.to.y - node.from.y) + 2 * pad
  const d = `M${node.from.x - x0} ${node.from.y - y0} L${node.to.x - x0} ${node.to.y - y0}`
  const sketch = roughPaths(d, W, H, { seed, roughness: t.roughness ?? 1, margin: 1, stroke: { color: node.stroke.color, width: node.stroke.width } })
  return { k: 'group', box: { x: x0, y: y0, width: W, height: H }, ...(node.part ? { part: node.part } : {}), children: sketch }
}

function treatPath(node: Extract<LayoutNode, { k: 'path' }>, t: RenderTreatment, seed: number): LayoutNode {
  // only an open outline: a filled path is a shape of its own (an icon-like glyph, a chart area)
  if (t.stroke !== 'rough' || node.fill || !sketchable(node.stroke)) return node
  if (!/^[\sMLCZ\d.,eE+-]+$/.test(node.d)) return node // relative or arc commands: left crisp
  const { width: W, height: H } = node.box
  if (W < 2 && H < 2) return node
  const sketch = roughPaths(node.d, Math.max(W, 4), Math.max(H, 4), { seed, roughness: t.roughness ?? 1, margin: 0, stroke: { color: node.stroke.color, width: node.stroke.width } })
  return { k: 'group', box: { x: node.box.x, y: node.box.y, width: W, height: H }, ...(node.part ? { part: node.part } : {}), children: sketch.map((s) => ({ ...s, box: { x: 0, y: 0, width: W, height: H } })) }
}

/**
 * The tree drawn in treatment `t` (unchanged when `t` asks for nothing). `key` seeds the sketch
 * (the block's type or id), so the same block always wobbles the same way.
 */
export function treatTree(node: LayoutNode, t: RenderTreatment | undefined, key = ''): LayoutNode {
  if (!t || (t.stroke !== 'rough' && t.fill !== 'hachure')) return node
  let n = 0
  const walk = (x: LayoutNode): LayoutNode => {
    const seed = hash(`${key}|${n++}|${x.k}`)
    switch (x.k) {
      case 'group':
        return { ...x, children: x.children.map(walk) }
      case 'rect':
        return treatRect(x, t, seed)
      // a line or a path whose box is at the parent's origin: its coordinates are the parent's in
      // both renderers (the DOM one paints them in the box, the SVG one in the parent)
      case 'line':
        return x.box.x === 0 && x.box.y === 0 ? treatLine(x, t, seed) : x
      case 'path':
        return x.box.x === 0 && x.box.y === 0 ? treatPath(x, t, seed) : x
      default:
        return x
    }
  }
  return walk(node)
}
