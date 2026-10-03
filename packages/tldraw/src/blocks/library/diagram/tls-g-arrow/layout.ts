/**
 * Pure layout for tls.g.arrow — one arrow across the box, in any of four directions.
 *
 * The path is built for `right` and rotated into place, so all four directions share one geometry:
 * straight (a line), curved (a quadratic arc bowing to one side) or elbow (horizontal, a step,
 * horizontal). The stroke stops at the arrow head's base so it never pokes through the tip. The
 * label sits beside the path on the free side, clipped to the box.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { ArrowProps } from './schema'
import { arrowHead, chartColors, clamp, enumOf, lineH, placeLines, polyline, root, str, strokePath, style } from '../_kit'

interface Pt {
  x: number
  y: number
}

export function layout(props: ArrowProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const c = chartColors(ctx)
  const kind = enumOf(props.kind, ['straight', 'curved', 'elbow'] as const, 'straight')
  const dir = enumOf(props.direction, ['right', 'left', 'up', 'down'] as const, 'right')
  const heads = enumOf(props.heads, ['end', 'both', 'none'] as const, 'end')
  const weight = { sm: 3, md: 5, lg: 8 }[enumOf(props.weight, ['sm', 'md', 'lg'] as const, 'md')]
  const tone = enumOf(props.tone, ['accent', 'text', 'muted'] as const, 'accent')
  const color = tone === 'accent' ? c.accent : tone === 'text' ? c.text : c.muted
  const label = str(props.label).trim()
  const labelS = style(ctx, 'caption', c.text)
  const nodes: LayoutNode[] = []

  // Work in a frame where the arrow runs left to right over a (len x span) rectangle.
  const vertical = dir === 'up' || dir === 'down'
  const len = vertical ? H : W
  const span = vertical ? W : H
  const flip = dir === 'left' || dir === 'up'
  const toWorld = (p: Pt): Pt => {
    const u = flip ? len - p.x : p.x
    return vertical ? { x: p.y, y: u } : { x: u, y: p.y }
  }
  const head = clamp(weight * 3.2, 12, 34)
  const m = Math.min(head, len / 4, 24)
  const mid = span / 2
  const start: Pt = { x: m, y: mid }
  const end: Pt = { x: len - m, y: mid }
  const both = heads === 'both'
  const hasEnd = heads !== 'none'

  // Path points (frame coordinates) and end tangents.
  let pts: Pt[]
  let tStart: Pt = { x: 1, y: 0 }
  let tEnd: Pt = { x: 1, y: 0 }
  let curve: { c: Pt } | null = null
  let s0 = start
  let e0 = end
  if (kind === 'elbow') {
    const y0 = clamp(mid + span * 0.28, 0, span)
    const y1 = clamp(mid - span * 0.28, 0, span)
    s0 = { x: m, y: y0 }
    e0 = { x: len - m, y: y1 }
    const xm = len / 2
    pts = [s0, { x: xm, y: y0 }, { x: xm, y: y1 }, e0]
  } else if (kind === 'curved') {
    const bow = span * 0.36
    const ctl = { x: len / 2, y: Math.max(1, mid - bow * 1.4) }
    s0 = { x: m, y: mid + span * 0.12 }
    e0 = { x: len - m, y: mid + span * 0.12 }
    curve = { c: ctl }
    pts = [s0, ctl, e0]
    const nrm = (a: Pt, b: Pt) => {
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
      return { x: (b.x - a.x) / d, y: (b.y - a.y) / d }
    }
    tStart = nrm(ctl, s0) // pointing out of the start
    tEnd = nrm(ctl, e0)
  } else {
    pts = [start, end]
  }
  const dirOut = (p: Pt, q: Pt) => {
    const d = Math.hypot(q.x - p.x, q.y - p.y) || 1
    return { x: (q.x - p.x) / d, y: (q.y - p.y) / d }
  }
  if (kind !== 'curved') {
    tEnd = dirOut(pts[pts.length - 2], pts[pts.length - 1])
    tStart = dirOut(pts[1], pts[0])
  }

  const f = (v: number) => String(Math.round(v * 100) / 100)
  const shorten = (p: Pt, t: Pt, by: number): Pt => ({ x: p.x - t.x * by, y: p.y - t.y * by })
  const a = both ? shorten(s0, tStart, head) : s0
  const z = hasEnd ? shorten(e0, tEnd, head) : e0
  let d: string
  if (curve) {
    const w = (p: Pt) => toWorld(p)
    const A = w(a)
    const C = w(curve.c)
    const Z = w(z)
    d = `M${f(A.x)} ${f(A.y)}Q${f(C.x)} ${f(C.y)} ${f(Z.x)} ${f(Z.y)}`
  } else {
    const body = pts.slice()
    body[0] = a
    body[body.length - 1] = z
    d = polyline(body.map(toWorld))
  }
  nodes.push(strokePath(ctx, d, 'arrow[path]', color, weight))
  if (hasEnd) {
    const tip = toWorld(e0)
    const t = toWorld({ x: e0.x + tEnd.x, y: e0.y + tEnd.y })
    nodes.push(arrowHead(ctx, tip, t.x - tip.x, t.y - tip.y, head, color, 'arrow[head-end]'))
  }
  if (both) {
    const tip = toWorld(s0)
    const t = toWorld({ x: s0.x + tStart.x, y: s0.y + tStart.y })
    nodes.push(arrowHead(ctx, tip, t.x - tip.x, t.y - tip.y, head, color, 'arrow[head-start]'))
  }

  if (label) {
    const lh = lineH(labelS)
    const free = Math.max(20, len - 2 * m)
    // Label position in the frame: beside the middle of the path, on the side with room.
    const lw = clamp(Math.min(free, vertical ? W - span * 0.5 - 16 : free), 20, free)
    if (!vertical) {
      const below = kind !== 'elbow'
      const ty = below ? Math.min(H - lh, mid + span * 0.12 + weight + 8) : clamp(mid - lh / 2, 0, H - lh)
      const tx = kind === 'elbow' ? (dir === 'right' ? W / 2 + 12 : 0) : (W - lw) / 2
      const w = kind === 'elbow' ? Math.max(20, W / 2 - 12 - m) : lw
      nodes.push(...placeLines(ctx, label, labelS, { x: dir === 'left' && kind === 'elbow' ? W / 2 - 12 - w : tx, y: ty, width: w }, kind === 'elbow' ? (dir === 'right' ? 'start' : 'end') : 'center', 1, 'label').nodes)
    } else {
      const x = Math.min(W - 20, W / 2 + weight + 12)
      const w = Math.max(20, W - x)
      nodes.push(...placeLines(ctx, label, labelS, { x: kind === 'elbow' ? x : x, y: clamp(H / 2 - lh / 2, 0, Math.max(0, H - lh)), width: w }, 'start', 1, 'label').nodes)
    }
  }
  return root(ctx, nodes)
}
