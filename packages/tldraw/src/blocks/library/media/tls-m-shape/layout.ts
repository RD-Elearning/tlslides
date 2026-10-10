/**
 * Pure layout for tls.m.shape — a circle, rounded box or (flat-top) hexagon with a centred label
 * and an optional icon above it (CMP3 atom, SURVEY A4 "shape with text").
 *
 * The shape takes its size step (circle 160 / 220 / 300 across; the box is wider and lower, the
 * hexagon a touch wider), scaled down to fit a smaller box, and sits centred across the box at
 * its top; the root reports the shape's height. The label takes the largest step of heading →
 * subheading → body → caption that fits the shape's inner area in at most three lines, centred
 * line by line. Paint from `atomPaint` (solid / soft / outline and the deck style's border, hard
 * shadow, glass); a rounded box takes the style's card radius, a hexagon has softly rounded
 * corners (a filled `path`). One group part `shape`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle, Size, TypeToken } from '../../../types'
import type { ShapeProps } from './schema'
import { atomPaint, type AtomTone } from '../../text/_engine/atom'
import { iconLeaf } from '../../text/_engine/icon'
import { textAligned } from '../../data/_chart/kit'
import { hasIcon } from '../../../icons'

export const SHAPE_PX = { sm: 160, md: 220, lg: 300 } as const
const STEPS: TypeToken[] = ['heading', 'subheading', 'body', 'caption']
const MAX_LINES = 3

type Kind = 'circle' | 'rounded' | 'hexagon'

/** Width and height of a shape of step `d`. */
function outer(kind: Kind, d: number): Size {
  if (kind === 'rounded') return { width: Math.round(d * 1.3), height: Math.round(d * 0.8) }
  if (kind === 'hexagon') {
    const w = Math.round(d * 1.15)
    return { width: w, height: Math.round(w * 0.866) }
  }
  return { width: d, height: d }
}

/** The label's area inside the shape (relative to its top-left). */
function inner(kind: Kind, s: Size): { x: number; y: number; width: number; height: number } {
  const f = kind === 'circle' ? 0.7 : kind === 'hexagon' ? 0.62 : 0.84
  const g = kind === 'circle' ? 0.62 : kind === 'hexagon' ? 0.7 : 0.74
  const width = s.width * f
  const height = s.height * g
  return { x: (s.width - width) / 2, y: (s.height - height) / 2, width, height }
}

/** A flat-top hexagon in `w` × `h` with corners rounded by `r` (quadratic joins). */
export function hexagonPath(x: number, y: number, w: number, h: number, r: number): string {
  const pts: Array<[number, number]> = [
    [x + w * 0.25, y],
    [x + w * 0.75, y],
    [x + w, y + h / 2],
    [x + w * 0.75, y + h],
    [x + w * 0.25, y + h],
    [x, y + h / 2],
  ]
  const n = pts.length
  const toward = (a: [number, number], b: [number, number], t: number): [number, number] => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    return [a[0] + (dx / len) * t, a[1] + (dy / len) * t]
  }
  const f = (v: number) => Math.round(v * 100) / 100
  let d = ''
  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n]
    const cur = pts[i]
    const next = pts[(i + 1) % n]
    const a = toward(cur, prev, r)
    const b = toward(cur, next, r)
    d += `${i === 0 ? 'M' : 'L'}${f(a[0])} ${f(a[1])}Q${f(cur[0])} ${f(cur[1])} ${f(b[0])} ${f(b[1])}`
  }
  return d + 'Z'
}

interface ShapeGeom {
  kind: Kind
  size: Size
  icon: number
  token: TypeToken
  style: ResolvedTextStyle
  textH: number
}

function geometry(props: ShapeProps, ctx: LayoutContext, maxW: number, maxH: number): ShapeGeom {
  const kind: Kind = props.shape === 'rounded' || props.shape === 'hexagon' ? props.shape : 'circle'
  const step = SHAPE_PX[props.size === 'sm' || props.size === 'lg' ? props.size : 'md']
  let size = outer(kind, step)
  const k = Math.min(1, maxW / size.width, maxH / size.height)
  if (k < 1) size = { width: Math.max(1, Math.floor(size.width * k)), height: Math.max(1, Math.floor(size.height * k)) }
  const box = inner(kind, size)
  const label = typeof props.label === 'string' ? props.label : ''
  const showIcon = typeof props.icon === 'string' && props.icon !== '' && hasIcon(props.icon)
  const icon = showIcon ? Math.round(Math.min(size.width, size.height) * 0.2) : 0
  const iconGap = showIcon ? Math.round(icon * 0.3) : 0
  let pick: { token: TypeToken; style: ResolvedTextStyle; h: number } | undefined
  for (const token of STEPS) {
    const base = ctx.resolveText(token)
    // Scale the step with the shape (a small shape keeps the same proportions).
    const style: ResolvedTextStyle = { ...base, size: Math.max(10, Math.round(base.size * Math.min(1, size.height / outer(kind, SHAPE_PX.md).height))), lineHeight: Math.min(base.lineHeight, 1.2) }
    const m = ctx.measureText(label, style, box.width)
    pick = { token, style, h: m.height }
    const longest = Math.max(0, ...label.split(/\s+/).map((w) => ctx.measureText(w, style).width))
    if (m.lines.length <= MAX_LINES && m.height + icon + iconGap <= box.height && longest <= box.width) break
  }
  const p = pick as { token: TypeToken; style: ResolvedTextStyle; h: number }
  return { kind, size, icon: icon > 0 ? icon + iconGap : 0, token: p.token, style: p.style, textH: p.h }
}

export function layout(props: ShapeProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = ctx.box.height > 0 ? ctx.box.height : Infinity
  const g = geometry(props, ctx, W, H)
  const { width: w, height: h } = g.size
  const tone: AtomTone = props.tone === 'solid' || props.tone === 'outline' ? props.tone : 'soft'
  const paint = atomPaint(ctx, tone, ctx.resolveColor('accent').color)
  const children: LayoutNode[] = []
  if (g.kind === 'hexagon') {
    const sw = paint.stroke?.width ?? 0
    children.push({
      k: 'path',
      part: 'shape.fill',
      box: { x: 0, y: 0, width: w, height: h },
      d: hexagonPath(sw / 2, sw / 2, w - sw, h - sw, Math.min(w, h) * 0.07),
      ...(paint.fill ? { fill: paint.fill } : {}),
      ...(paint.stroke ? { stroke: paint.stroke } : {}),
    } as LayoutNode)
  } else {
    const radius = g.kind === 'circle' ? Math.min(w, h) / 2 : Math.min(h / 2, Math.max(ctx.tokens.radius.lg ?? 12, 4))
    children.push({
      k: 'rect',
      part: 'shape.fill',
      box: { x: 0, y: 0, width: w, height: h },
      ...(paint.fill ? { fill: paint.fill } : {}),
      ...(paint.stroke ? { stroke: paint.stroke } : {}),
      ...(paint.shadow ? { shadow: paint.shadow } : {}),
      radius,
    } as LayoutNode)
  }
  const area = inner(g.kind, g.size)
  const blockH = g.icon + g.textH
  let y = area.y + Math.max(0, (area.height - blockH) / 2)
  if (g.icon > 0) {
    const side = Math.round(g.icon / 1.3)
    children.push(iconLeaf(props.icon, { x: (w - side) / 2, y, width: side, height: side }, paint.ink, 'shape.icon'))
    y += g.icon
  }
  const label = typeof props.label === 'string' ? props.label : ''
  const t = textAligned(ctx, label, { ...g.style, color: paint.ink }, { x: area.x, y, width: area.width }, 'center', 'shape.label')
  children.push(...t.nodes.map((n) => (n.k === 'text' ? ({ ...n, propPath: 'label' } as LayoutNode) : n)))
  const shape: LayoutNode = { k: 'group', part: 'shape', box: { x: Math.max(0, (W - w) / 2), y: 0, width: w, height: h }, children }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: h }, children: [shape] }
}

/** The shape's own size (a stack or an anchor gives it exactly this). */
export function intrinsicSize(props: ShapeProps, ctx: LayoutContext): Size {
  return geometry(props, ctx, Math.max(1, ctx.box.width || 4000), Infinity).size
}
