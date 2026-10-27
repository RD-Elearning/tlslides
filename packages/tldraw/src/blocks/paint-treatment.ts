/**
 * spro enhance PLAN.md S2 — the render treatment: how a style *draws* what the layout placed.
 * Applied to a block's laid-out tree just before it is painted (editor, viewer, SVG export), never
 * to the geometry the oracle measures: every node keeps its box, only its paint changes.
 *
 * - `stroke: 'rough'` — rect borders, solid lines without a marker and stroked open paths become
 *   Rough.js sketches (a wobbly double ink line), seeded per node so a render is reproducible;
 * - `fill: 'hachure'` — a filled rect also gets a pen-hatched layer in a darker tint of its fill.
 * - `emphasis: 'highlighter'` — every bold run gets a marker band behind its lower half (notebook,
 *   sketchnote), measured with the editor's width tables.
 *
 * A rect becomes a group at its box: the rect itself (fill, radius, shadow; no border) plus the
 * sketch as box-local `path` leaves — the convention both renderers paint the same way (a path's
 * `d` is local to its box, the box at the group's origin). Text, icons and images are unchanged.
 *
 * Pure and DOM-free.
 */
import { roughOutline, roughPaths } from './library/media/tls-m-decoration/rough'
import type { LayoutNode, Paint, Stroke } from './types'
import { mixHex } from './color-math'
import { editorMetrics } from './layout/measure'
import { paintsAnything, type Treatment } from './look'

/** The treatment painted: the style's render treatment or a resolved look (CR7b, `look.ts`). */
export type RenderTreatment = Treatment

/** Hand strokes (CR7b): how each pen sketches. */
const PENS: Record<string, { roughness: number; width: number; single?: boolean; lighten?: number }> = {
  rough: { roughness: 1, width: 1 },
  marker: { roughness: 0.55, width: 1.6 },
  ink: { roughness: 0.45, width: 1, single: true },
  chalk: { roughness: 1.6, width: 1.2, lighten: 0.22 },
}
const pen = (t: RenderTreatment) => (t.stroke ? PENS[t.stroke] : undefined)
const penStroke = (s: Stroke, t: RenderTreatment): { color: string; width: number } => {
  const p = pen(t)!
  const color = p.lighten && /^#[0-9a-f]{6}$/i.test(s.color) ? mixHex(s.color, '#ffffff', p.lighten) : s.color
  return { color, width: Math.max(s.width * p.width, s.width + (p.width > 1 ? 1 : 0)) }
}
const roughness = (t: RenderTreatment) => (t.stroke === 'rough' ? t.roughness ?? 1 : pen(t)?.roughness ?? 1)

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

/** A chamfered rectangle (corner `cut`). */
function cutRectPath(w: number, h: number, c: number): string {
  const k = Math.max(0, Math.min(c, w / 3, h / 3))
  return `M${k} 0 L${w - k} 0 L${w} ${k} L${w} ${h - k} L${w - k} ${h} L${k} ${h} L0 ${h - k} L0 ${k} Z`
}

/** The corner radius of a look (undefined: the block's own). */
function cornerRadius(node: Extract<LayoutNode, { k: 'rect' }>, t: RenderTreatment): number | number[] | undefined {
  const { width: W, height: H } = node.box
  switch (t.corner) {
    case 'square':
      return 0
    case 'round':
      return Math.max(typeof node.radius === 'number' ? node.radius : 0, Math.min(16, W / 4, H / 4))
    case 'pill':
      return H <= 160 || W <= 160 ? Math.min(W, H) / 2 : Math.min(28, W / 4, H / 4)
    default:
      return node.radius
  }
}

/** The fill of a look: a soft gradient of the block's colour, else the fill as it is. */
function lookFill(fill: Paint | undefined, t: RenderTreatment): Paint | undefined {
  const hex = solid(fill)
  if (t.fill === 'gradient' && hex) {
    return { type: 'linearGradient', angle: 135, stops: [{ color: mixHex(hex, '#ffffff', 0.18), at: 0 }, { color: mixHex(hex, '#000000', 0.06), at: 1 }] }
  }
  return fill
}

function lookShadow(node: Extract<LayoutNode, { k: 'rect' }>, t: RenderTreatment): 0 | 1 | 2 | 'hard' | undefined {
  switch (t.depth) {
    case 'flat':
      return undefined
    case 'soft':
      return node.fill ? 1 : node.shadow
    case 'clay':
      return node.fill ? 2 : node.shadow
    case 'hard':
    case 'extrude':
      return node.fill || node.stroke ? 'hard' : node.shadow
    default:
      return node.shadow
  }
}

/** Paper sheets under a panel (depth `stack`): two offset copies in a darker tint, inside the box. */
function stackSheets(W: number, H: number, fill: Paint | undefined, radius: number | number[] | undefined): LayoutNode[] {
  const hex = solid(fill)
  if (!hex || W < 40 || H < 40) return []
  const o = Math.min(8, W / 20, H / 20)
  const sheet = (k: number, tint: number): LayoutNode => ({ k: 'rect', part: 'shape', box: { x: k * o, y: k * o, width: W - 2 * o, height: H - 2 * o }, fill: { type: 'solid', color: mixHex(hex, '#000000', tint) }, ...(radius !== undefined ? { radius } : {}) })
  return [sheet(2, 0.14), sheet(1, 0.07)]
}

function treatRect(node: Extract<LayoutNode, { k: 'rect' }>, t: RenderTreatment, seed: number): LayoutNode {
  const { width: W, height: H } = node.box
  if (W < 4 || H < 4) return node
  const p = pen(t)
  const sketch = !!p && sketchable(node.stroke)
  const fillHex = solid(node.fill)
  const hatch = (t.fill === 'hachure' || t.fill === 'crosshatch') && !!fillHex && W >= 24 && H >= 24
  const radius = cornerRadius(node, t)
  const shadow = lookShadow(node, t)
  const fill = lookFill(node.fill, t)
  const shaped = t.corner === 'cut' || t.corner === 'wobbly'
  const stack = t.depth === 'stack' ? stackSheets(W, H, node.fill, radius) : []
  if (!sketch && !hatch && !shaped && !stack.length) {
    if (radius === node.radius && shadow === node.shadow && fill === node.fill) return node
    const out: Extract<LayoutNode, { k: 'rect' }> = { ...node, ...(fill ? { fill } : {}) }
    if (radius !== undefined) out.radius = radius
    if (shadow) out.shadow = shadow
    else delete out.shadow
    return out
  }
  const r = typeof radius === 'number' ? radius : Array.isArray(radius) ? radius[0] : 0
  const d = t.corner === 'cut' ? cutRectPath(W, H, Math.min(18, W / 6, H / 6)) : roundedRectPath(W, H, r)
  const stroke = sketch ? penStroke(node.stroke!, t) : undefined
  const lines = sketch || hatch
    ? roughPaths(d, W, H, {
        seed,
        roughness: roughness(t),
        margin: stroke ? stroke.width / 2 + 1 : 1,
        fit: 'axes',
        ...(p?.single ? { single: true } : {}),
        ...(stroke ? { stroke } : {}),
        ...(hatch ? { hachure: { color: mixHex(fillHex!, '#000000', 0.12), gap: t.fill === 'crosshatch' ? 18 : 14, weight: 1.5, cross: t.fill === 'crosshatch' } } : {}),
      })
    : []
  // the fill follows the hand-drawn (or cut) edge, so no crisp corner shows past the ink; a
  // shadowed panel keeps its rect (the shadow is a rect effect)
  const local = { x: 0, y: 0, width: W, height: H }
  const wobbly = (sketch || t.corner === 'wobbly') && !shadow
  const edge = t.corner === 'cut' ? d : wobbly ? roughOutline(d, W, H, { seed, roughness: (sketch ? roughness(t) : 1) * 0.6, margin: (stroke?.width ?? 1) / 2 + 1, fit: 'axes' }) : undefined
  const keepStroke = !sketch && node.stroke ? { stroke: node.stroke } : {}
  const base: LayoutNode =
    edge && (fill || (!sketch && node.stroke))
      ? { k: 'path', box: local, d: edge, ...(fill ? { fill } : {}), ...keepStroke, ...(node.part ? { part: node.part } : {}) }
      : { k: 'rect', box: local, ...(fill ? { fill } : {}), ...(radius !== undefined ? { radius } : {}), ...(shadow ? { shadow } : {}), ...keepStroke, ...(node.part ? { part: node.part } : {}) }
  return { k: 'group', box: node.box, ...(node.part ? { part: node.part } : {}), children: [...stack, base, ...lines] }
}

function treatLine(node: Extract<LayoutNode, { k: 'line' }>, t: RenderTreatment, seed: number): LayoutNode {
  // connector `dotted`: an arrow (a line with a marker) is drawn dotted, crisp
  if (t.connector === 'dotted' && node.marker && node.stroke && node.stroke.width > 0) {
    return { ...node, stroke: { ...node.stroke, dash: [node.stroke.width * 1.2, node.stroke.width * 2.6] } }
  }
  if (!pen(t) || node.marker || !sketchable(node.stroke)) return node
  const pad = node.stroke.width + 6
  const x0 = Math.min(node.from.x, node.to.x) - pad
  const y0 = Math.min(node.from.y, node.to.y) - pad
  const W = Math.abs(node.to.x - node.from.x) + 2 * pad
  const H = Math.abs(node.to.y - node.from.y) + 2 * pad
  const d = `M${node.from.x - x0} ${node.from.y - y0} L${node.to.x - x0} ${node.to.y - y0}`
  const sketch = roughPaths(d, W, H, { seed, roughness: roughness(t), margin: 1, fit: 'axes', ...(pen(t)!.single ? { single: true } : {}), stroke: penStroke(node.stroke, t) })
  return { k: 'group', box: { x: x0, y: y0, width: W, height: H }, ...(node.part ? { part: node.part } : {}), children: sketch }
}

function treatPath(node: Extract<LayoutNode, { k: 'path' }>, t: RenderTreatment, seed: number): LayoutNode {
  // only an open outline: a filled path is a shape of its own (an icon-like glyph, a chart area)
  if (!pen(t) || node.fill || !sketchable(node.stroke)) return node
  if (!/^[\sMLCZ\d.,eE+-]+$/.test(node.d)) return node // relative or arc commands: left crisp
  const { width: W, height: H } = node.box
  if (W < 2 && H < 2) return node
  const sketch = roughPaths(node.d, Math.max(W, 4), Math.max(H, 4), { seed, roughness: roughness(t), margin: 0, fit: 'axes', ...(pen(t)!.single ? { single: true } : {}), stroke: penStroke(node.stroke!, t) })
  return { k: 'group', box: { x: node.box.x, y: node.box.y, width: W, height: H }, ...(node.part ? { part: node.part } : {}), children: sketch.map((s) => ({ ...s, box: { x: 0, y: 0, width: W, height: H } })) }
}

/** Hand marks on each bold run of a text node (emphasis `highlighter | underline | box | circle |
 *  color`), in the node's box, behind the text (a ring or a box over it, never covering glyphs). */
function treatText(node: Extract<LayoutNode, { k: 'text' }>, t: RenderTreatment, seed: number): LayoutNode {
  const e = t.emphasis
  if (!e || e === 'bold' || !node.lines.some((l) => l.runs?.some((r) => r.bold && r.text.trim()))) return node
  const color = t.highlight ?? '#FFE066'
  const ink = node.style.color && /^#[0-9a-f]{6}$/i.test(node.style.color) ? node.style.color : '#333333'
  const fs = (node.style.size ?? 32) * (node.style.scale ?? 1)
  const lh = fs * (node.style.lineHeight ?? 1.3)
  const marks: LayoutNode[] = []
  let k = 0
  node.lines.forEach((line, i) => {
    let x = 0
    const top = line.top ?? i * lh
    for (const run of line.runs ?? []) {
      const w = editorMetrics(run.text, node.style).width * (node.style.scale ?? 1)
      if (run.bold && run.text.trim()) {
        const pad = fs * 0.12
        const s2 = seed + 31 * k++
        if (e === 'highlighter') {
          marks.push({ k: 'rect', part: 'highlight', box: { x: x - pad, y: top + lh * 0.5, width: w + 2 * pad, height: lh * 0.42 }, fill: { type: 'solid', color: `${color}B3` }, radius: pad })
        } else if (e === 'color') {
          marks.push({ k: 'rect', part: 'highlight', box: { x: x - pad, y: top + lh * 0.12, width: w + 2 * pad, height: lh * 0.8 }, fill: { type: 'solid', color: `${color}55` }, radius: pad * 2 })
        } else if (e === 'underline') {
          const W = w + 2 * pad
          const H = Math.max(6, fs * 0.22)
          marks.push({ k: 'group', part: 'highlight', box: { x: x - pad, y: top + lh * 0.82, width: W, height: H }, children: roughPaths(`M0 ${H / 2} L${W} ${H / 2}`, W, H, { seed: s2, roughness: 1.2, margin: 0, fit: 'axes', single: true, stroke: { color: ink, width: Math.max(2, fs * 0.07) } }) })
        } else {
          const W = w + 4 * pad
          const H = lh * 0.95
          const d = e === 'box' ? roundedRectPath(W, H, pad) : `M${W / 2} 0 C${W * 1.05} 0 ${W} ${H} ${W / 2} ${H} C0 ${H} ${-W * 0.05} 0 ${W / 2} ${H * 0.04}`
          marks.push({ k: 'group', part: 'highlight', box: { x: x - 2 * pad, y: top + (lh - H) / 2, width: W, height: H }, children: roughPaths(d, W, H, { seed: s2, roughness: 1, margin: 1, fit: 'axes', single: true, stroke: { color: ink, width: Math.max(1.5, fs * 0.05) } }) })
        }
      }
      x += w
    }
  })
  if (!marks.length) return node
  return { k: 'group', box: node.box, ...(node.part ? { part: node.part } : {}), children: [...marks, { ...node, box: { ...node.box, x: 0, y: 0 } }] }
}

/**
 * The tree drawn in treatment `t` (unchanged when `t` asks for nothing). `key` seeds the sketch
 * (the block's type or id), so the same block always wobbles the same way.
 */
export function treatTree(node: LayoutNode, t: RenderTreatment | undefined, key = ''): LayoutNode {
  if (!paintsAnything(t)) return node
  let n = 0
  const walk = (x: LayoutNode): LayoutNode => {
    const seed = hash(`${key}|${n++}|${x.k}`)
    switch (x.k) {
      case 'group':
        return { ...x, children: x.children.map(walk) }
      case 'rect':
        return treatRect(x, t!, seed)
      // a line or a path whose box is at the parent's origin: its coordinates are the parent's in
      // both renderers (the DOM one paints them in the box, the SVG one in the parent)
      case 'line':
        return x.box.x === 0 && x.box.y === 0 ? treatLine(x, t!, seed) : x
      case 'path':
        return x.box.x === 0 && x.box.y === 0 ? treatPath(x, t!, seed) : x
      case 'text':
        return treatText(x, t!, seed)
      default:
        return x
    }
  }
  return walk(node)
}
