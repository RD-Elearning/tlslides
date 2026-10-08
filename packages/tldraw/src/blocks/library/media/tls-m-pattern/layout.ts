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

export function layout(props: PatternProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const pattern = enumOf(props.pattern, ['dots', 'grid', 'lines', 'diagonal'] as const, 'dots')
  const scale = enumOf(props.scale, ['md', 'sm', 'lg'] as const, 'md')
  const tone = enumOf(props.tone, ['line', 'accent', 'alt'] as const, 'line')
  const op = enumOf(props.opacity, ['soft', 'medium'] as const, 'soft')
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
