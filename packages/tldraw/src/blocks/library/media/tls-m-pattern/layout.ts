/**
 * Pure layout for tls.m.pattern — a repeating texture drawn as ONE `path` node.
 *
 * Dots are small circles (two arcs each), grid / lines / diagonal are stroked segments, all in a
 * single `d`, so a full slide is one node however many marks it has (the dot count is capped by
 * widening the spacing). Marks are inset by half a stroke / a radius so nothing leaves the box
 * (the DOM renderer clips a path to its box, the SVG renderer does not).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { PatternProps } from './schema'
import { enumOf, side, tintOf } from '../_kit'

export const PATTERN_GAP = { sm: 32, md: 48, lg: 80 } as const
export const MAX_DOTS = 2500
const STROKE = 2

const f = (v: number) => String(Math.round(v * 100) / 100)

export interface Mark {
  /** `dot` centre, or a `seg` from (x, y) to (x2, y2). */
  kind: 'dot' | 'seg'
  x: number
  y: number
  x2?: number
  y2?: number
}

/** The marks of a pattern in a W x H box. Pure; exported for tests. */
export function patternMarks(pattern: 'dots' | 'grid' | 'lines' | 'diagonal', gap0: number, W: number, H: number): { marks: Mark[]; gap: number; r: number } {
  let gap = gap0
  const marks: Mark[] = []
  const r = Math.max(1.5, gap * 0.07)
  const m = pattern === 'dots' ? r : STROKE / 2
  if (W <= 2 * m || H <= 2 * m) return { marks, gap, r }
  if (pattern === 'dots') {
    while (((Math.floor((W - 2 * m) / gap) + 1) * (Math.floor((H - 2 * m) / gap) + 1)) > MAX_DOTS) gap *= 1.25
    const cols = Math.floor((W - 2 * m) / gap) + 1
    const rows = Math.floor((H - 2 * m) / gap) + 1
    const x0 = (W - (cols - 1) * gap) / 2
    const y0 = (H - (rows - 1) * gap) / 2
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) marks.push({ kind: 'dot', x: x0 + i * gap, y: y0 + j * gap })
  } else if (pattern === 'grid' || pattern === 'lines') {
    for (let y = gap / 2; y < H - m; y += gap) marks.push({ kind: 'seg', x: m, y, x2: W - m, y2: y })
    if (pattern === 'grid') for (let x = gap / 2; x < W - m; x += gap) marks.push({ kind: 'seg', x, y: m, x2: x, y2: H - m })
  } else {
    // 45 degree lines x - y = c, clipped to the inset box.
    const x1 = m
    const x2 = W - m
    const y1 = m
    const y2 = H - m
    for (let c = -(y2 - x1); c <= x2 - y1; c += gap * 1.4142) {
      const ax = Math.max(x1, y1 + c)
      const bx = Math.min(x2, y2 + c)
      if (bx - ax > 1) marks.push({ kind: 'seg', x: ax, y: ax - c, x2: bx, y2: bx - c })
    }
  }
  return { marks, gap, r }
}

export function patternPath(pattern: 'dots' | 'grid' | 'lines' | 'diagonal', gap: number, W: number, H: number): { d: string; count: number } {
  const { marks, r } = patternMarks(pattern, gap, W, H)
  let d = ''
  for (const k of marks) {
    d += k.kind === 'dot'
      ? `M${f(k.x - r)} ${f(k.y)}A${f(r)} ${f(r)} 0 1 0 ${f(k.x + r)} ${f(k.y)}A${f(r)} ${f(r)} 0 1 0 ${f(k.x - r)} ${f(k.y)}Z`
      : `M${f(k.x)} ${f(k.y)}L${f(k.x2!)} ${f(k.y2!)}`
  }
  return { d, count: marks.length }
}

/* ── AC4 backdrops (ai-curation §2.3 rank 4, §4.2) ────────────────────────────────────── */

/** `#rrggbb` (or `#rgb`) → `rgba(r,g,b,a)`; any other colour is returned as is. */
export function rgba(hex: string, a: number): string {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return hex
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.round(a * 1000) / 1000})`
}

/** Grain noise frequency per scale (higher = finer grain). */
export const GRAIN_FREQUENCY = { sm: 1.1, md: 0.85, lg: 0.6 } as const

/**
 * The grain texture: a self-contained SVG (`feTurbulence` fractal noise, its luminance turned into
 * the alpha of one colour) as a data URI, drawn by an `image` node — DOM `<img>`, SVG `<image>`,
 * so both renderers paint the same file. ~0.6 KB. Deterministic (`seed` fixed).
 */
export function grainDataUri(W: number, H: number, color: string, alpha: number, frequency: number): string {
  const c = /^#?[0-9a-f]{6}$/i.test(color.replace('#', '')) ? color.replace('#', '') : '808080'
  const n = parseInt(c, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round((v / 255) * 1000) / 1000)
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${Math.round(W)}' height='${Math.round(H)}'>` +
    `<filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='2' seed='7' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${Math.round(alpha * 2.4 * 1000) / 1000} 0 0 0 ${-Math.round(alpha * 0.9 * 1000) / 1000}'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#g)'/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Mesh glows: centre (fraction of the box), size (fraction of the box) and colour role. */
export const MESH_GLOWS: ReadonlyArray<{ cx: number; cy: number; size: number; role: 'accent' | 'accent2' }> = [
  { cx: 0.18, cy: 0.22, size: 0.95, role: 'accent' },
  { cx: 0.86, cy: 0.8, size: 0.85, role: 'accent2' },
  { cx: 0.62, cy: 0.08, size: 0.55, role: 'accent' },
]
const MESH_SCALE = { sm: 0.7, md: 1, lg: 1.25 } as const

/** The mesh: one rect per glow, each a radial gradient from the colour at `alpha` to clear,
 *  its box the glow's square clamped into the block (so nothing leaves the box). */
export function meshNodes(W: number, H: number, colors: { accent: string; accent2: string }, alpha: number, scale: keyof typeof MESH_SCALE): LayoutNode[] {
  return MESH_GLOWS.map((g, i) => {
    const D = Math.max(W, H) * g.size * MESH_SCALE[scale]
    const x0 = Math.max(0, g.cx * W - D / 2)
    const y0 = Math.max(0, g.cy * H - D / 2)
    const x1 = Math.min(W, g.cx * W + D / 2)
    const y1 = Math.min(H, g.cy * H + D / 2)
    const box = { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) }
    // the gradient's centre inside the clamped box, and its 50 % radius = the glow's half size:
    // a clamped box keeps the glow round by moving the centre off 0.5 (objectBoundingBox units)
    const cx = box.width > 0 ? (g.cx * W - x0) / box.width : 0.5
    const cy = box.height > 0 ? (g.cy * H - y0) / box.height : 0.5
    const c = colors[g.role]
    const a = i === 2 ? alpha * 0.7 : alpha
    return {
      k: 'rect',
      part: `glow[${i}]`,
      box,
      fill: { type: 'radialGradient', cx, cy, stops: [{ color: rgba(c, a), at: 0 }, { color: rgba(c, a * 0.45), at: 0.45 }, { color: rgba(c, 0), at: 1 }] },
    } as LayoutNode
  })
}

export function layout(props: PatternProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const pattern = enumOf(props.pattern, ['dots', 'grid', 'lines', 'diagonal', 'grain', 'mesh'] as const, 'dots')
  const scale = enumOf(props.scale, ['md', 'sm', 'lg'] as const, 'md')
  const tone = enumOf(props.tone, ['line', 'accent', 'alt'] as const, 'line')
  const op = enumOf(props.opacity, ['soft', 'medium'] as const, 'soft')
  const root = (children: LayoutNode[]): LayoutNode => ({ k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children })
  if (pattern === 'mesh') {
    // §3.3 gradient: 2-3 radial accent / accent2 glows at 18-30 %.
    return root(meshNodes(W, H, { accent: ctx.resolveColor('accent').color, accent2: ctx.resolveColor('accent2').color }, op === 'soft' ? 0.22 : 0.32, scale))
  }
  if (pattern === 'grain') {
    // §3.3 gradient: grain at ~4 % — the text colour (light grain on a dark slide), or the tone's.
    const color = tone === 'accent' ? ctx.resolveColor('accent').color : tone === 'alt' ? ctx.resolveColor('surfaceAlt').color : ctx.resolveColor('text').color
    const url = grainDataUri(W, H, color, op === 'soft' ? 0.05 : 0.09, GRAIN_FREQUENCY[scale])
    return root([{ k: 'image', part: 'pattern', box: { x: 0, y: 0, width: W, height: H }, assetId: '', url, alt: '', fit: 'cover' }])
  }
  const color =
    tone === 'accent' ? ctx.resolveColor('accent').color : tone === 'alt' ? ctx.resolveColor('surfaceAlt').color : tintOf(ctx.resolveColor('surface').color, ctx.resolveColor('line').color, 0.9)
  const { d } = patternPath(pattern, PATTERN_GAP[scale], W, H)
  const node: LayoutNode =
    pattern === 'dots'
      ? { k: 'path', part: 'pattern', box: { x: 0, y: 0, width: W, height: H }, d: d || 'M0 0', fill: { type: 'solid', color } }
      : { k: 'path', part: 'pattern', box: { x: 0, y: 0, width: W, height: H }, d: d || 'M0 0', stroke: { color, width: tone === 'alt' ? STROKE + 1 : STROKE } }
  return {
    k: 'group',
    part: 'root',
    box: { x: 0, y: 0, width: W, height: H },
    ...(tone === 'alt' ? {} : { opacity: op === 'soft' ? 0.35 : 0.65 }),
    children: [node],
  }
}
