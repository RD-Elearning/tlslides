/**
 * P3 diagram kit: small pure helpers shared by the `tls.g.*` process and timeline blocks, on top of
 * the P2 chart kit (`library/data/_chart/kit.ts`) and the P0.8 diagram helpers.
 *
 * Conventions (same as the chart kit): `path` nodes carry ABSOLUTE coordinates in block space and a
 * box of the whole block at (0, 0); lines are thin `rect`s; text is clipped (ellipsis) rather than
 * allowed to overflow; text widths are only estimates (-20%..+35%) so every "does it fit" decision
 * multiplies by TEXT_SLACK.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box, LayoutContext, LayoutNode, ResolvedTextStyle } from '../../types'
import { mixHex } from '../../color-math'
import { clipLines, ellipsize, fullBox, lineH, pathNode, solidRect } from '../data/_chart/kit'

export { TEXT_SLACK, asArr, clamp, enumOf, numOrNull, root, str, style, mutedStyle, lineH, chartColors, tintOf, onColor, readableOn, solidRect, pathNode, emptyState, capacityOf, dot } from '../data/_chart/kit'

/** Plain-object entries of an unknown list value (anything else is dropped). */
export function objs(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) as Array<Record<string, unknown>>) : []
}

/** A part-name-safe version of a free id. */
export function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || '_'
}

export interface PlacedLines {
  nodes: LayoutNode[]
  /** Height of the clipped text (lines x line height). */
  height: number
  /** Widest estimated line. */
  width: number
  lineCount: number
}

/**
 * Text clipped to `maxLines` of `box.width` and placed start / center / end aligned. Over-long
 * words are cut with an ellipsis so a narrow box never wraps per letter. Non-start alignment emits
 * one node per line (parts `part`, `part.1`, ...) because text nodes carry no alignment.
 */
export function placeLines(
  ctx: LayoutContext,
  text: string,
  s: ResolvedTextStyle,
  box: { x: number; y: number; width: number },
  align: 'start' | 'center' | 'end',
  maxLines: number,
  part: string
): PlacedLines {
  const w = Math.max(1, box.width)
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean || maxLines < 1) return { nodes: [], height: 0, width: 0, lineCount: 0 }
  const words = clean.split(' ').map((x) => ellipsize(ctx, x, s, w))
  const m = ctx.measureText(words.join(' '), s, w)
  const lines = clipLines(m.lines, Math.max(1, Math.floor(maxLines)))
  const lh = lineH(s)
  const height = lines.length * lh
  const width = Math.min(w, Math.max(0, ...lines.map((l) => l.width)))
  if (align === 'start') {
    return {
      nodes: [{ k: 'text', part, box: { x: box.x, y: box.y, width: w, height }, lines, style: s }],
      height,
      width,
      lineCount: lines.length,
    }
  }
  const nodes: LayoutNode[] = lines.map((l, i) => {
    const lw = Math.min(w, l.width)
    const x = align === 'center' ? box.x + (w - lw) / 2 : box.x + (w - lw)
    return {
      k: 'text',
      part: i === 0 ? part : `${part}.${i}`,
      box: { x, y: box.y + i * lh, width: Math.max(1, lw + 1), height: lh },
      lines: [{ ...l, top: 0, baseline: l.baseline - (l.top ?? i * lh) }],
      style: s,
    } as LayoutNode
  })
  return { nodes, height, width, lineCount: lines.length }
}

/** Height `placeLines` would use, without building nodes. */
export function linesHeight(ctx: LayoutContext, text: string, s: ResolvedTextStyle, width: number, maxLines: number): number {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean || maxLines < 1) return 0
  const w = Math.max(1, width)
  const m = ctx.measureText(clean.split(' ').map((x) => ellipsize(ctx, x, s, w)).join(' '), s, w)
  return Math.min(m.lines.length, Math.floor(maxLines)) * lineH(s)
}

/** Stroke-only path (arcs, polylines) in absolute block coordinates. */
export function strokePath(ctx: LayoutContext, d: string, part: string, color: string, width = 2): LayoutNode {
  return pathNode(ctx, d, part, { stroke: color, strokeWidth: width })
}

/** A filled triangular arrowhead with its tip at `tip`, pointing along unit vector (ux, uy). */
export function arrowHead(ctx: LayoutContext, tip: { x: number; y: number }, ux: number, uy: number, size: number, color: string, part: string): LayoutNode {
  const f = (v: number) => String(Math.round(v * 100) / 100)
  const bx = tip.x - ux * size
  const by = tip.y - uy * size
  const h = size * 0.55
  const d = `M${f(tip.x)} ${f(tip.y)}L${f(bx - uy * h)} ${f(by + ux * h)}L${f(bx + uy * h)} ${f(by - ux * h)}Z`
  return pathNode(ctx, d, part, { fill: color })
}

/** A polyline path string from points. */
export function polyline(points: Array<{ x: number; y: number }>): string {
  const f = (v: number) => String(Math.round(v * 100) / 100)
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${f(p.x)} ${f(p.y)}`).join('')
}

/** Thin horizontal or vertical bar as a rect (the `line` node is unreliable in the DOM). */
export function bar(box: Box, color: string, part: string): LayoutNode {
  return solidRect(box, color, part)
}

/** Colour i of n on the accent -> accent2 ramp (or the categorical ramp / one accent). */
export function rampColor(ctx: LayoutContext, mode: 'gradient' | 'single' | 'series', i: number, n: number): string {
  const a = ctx.resolveColor('accent').color
  if (mode === 'single') return a
  if (mode === 'series') return ctx.tokens.categorical[i % Math.max(1, ctx.tokens.categorical.length)] ?? a
  const b = ctx.resolveColor('accent2').color
  return mixHex(a, b, n <= 1 ? 0 : i / (n - 1))
}

export { fullBox }

/** Bounding box of every number pair in an absolute path `d` (used by the collision tests). */
export function pathBounds(d: string): Box {
  const nums = [...d.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
  if (nums.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  const xs = nums.map((p) => p.x)
  const ys = nums.map((p) => p.y)
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}
