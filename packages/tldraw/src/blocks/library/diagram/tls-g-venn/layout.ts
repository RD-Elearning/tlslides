/**
 * Pure layout for tls.g.venn — two or three overlapping circles, deterministic and seed-free.
 *
 * Circles are round `rect`s inside a faded group (the Paint model has no alpha), so overlaps tint
 * by stacking the translucent fills, the same in the DOM and the SVG renderer; a full-strength ring
 * outlines each. Two sets sit side by side with centres 1.1 r apart; three sit on an equilateral
 * triangle with side 1.1 r, so every pair lens and the common centre have room for a short text.
 * `inside` puts each set's label and note in the part of its circle nobody else covers; `outside`
 * moves them beside the circles (left / right, the third below).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { VennProps } from './schema'
import { VENN_MAX } from './schema'
import { asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, placeLines, rampColor, root, str, style } from '../_kit'

const SQ3 = Math.sqrt(3)

interface Circle {
  cx: number
  cy: number
  r: number
}

export function layout(props: VennProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const sets = objs(props.sets)
    .slice(0, VENN_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text) }))
  const N = sets.length
  if (N < 2) return emptyState(ctx, 'Add two or three sets')
  const c = chartColors(ctx)
  const outside = enumOf(props.labels, ['inside', 'outside'] as const, 'inside') === 'outside'
  const opacity = enumOf(props.opacity, ['soft', 'medium'] as const, 'soft') === 'medium' ? 0.55 : 0.34
  const labelS = style(ctx, 'caption', c.text)
  const noteS = mutedStyle(ctx, 'footnote')
  const smallS = style(ctx, 'footnote', c.text)
  const overlapText = str(props.overlap).trim()
  const pairs = asArr(props.pairOverlaps).map(str)

  // ---- circle placement -----------------------------------------------------------------------
  const marginX = outside ? clamp(W * 0.2, 90, 260) : 0
  const bandB = outside && N === 3 ? Math.min(96, H * 0.2) : 0
  const availW = Math.max(10, W - 2 * marginX)
  const availH = Math.max(10, H - bandB)
  const circles: Circle[] = []
  let centroid = { x: W / 2, y: availH / 2 }
  let r: number
  if (N === 2) {
    const d = 1.1
    r = Math.max(4, Math.min(availH / 2, availW / (2 + d)))
    const x0 = W / 2 - (d * r) / 2
    circles.push({ cx: x0, cy: availH / 2, r }, { cx: x0 + d * r, cy: availH / 2, r })
  } else {
    const s = 1.1
    const h = (s * SQ3) / 2
    r = Math.max(4, Math.min(availH / (h + 2), availW / (s + 2)))
    const top = -h / 3 - 1
    const bottom = (2 * h) / 3 + 1
    centroid = { x: W / 2, y: availH / 2 - ((top + bottom) / 2) * r }
    circles.push(
      { cx: centroid.x - (s / 2) * r, cy: centroid.y - (h / 3) * r, r },
      { cx: centroid.x + (s / 2) * r, cy: centroid.y - (h / 3) * r, r },
      { cx: centroid.x, cy: centroid.y + ((2 * h) / 3) * r, r }
    )
  }

  const nodes: LayoutNode[] = []
  const box = (cc: Circle) => ({ x: cc.cx - cc.r, y: cc.cy - cc.r, width: 2 * cc.r, height: 2 * cc.r })

  // Text block centred on (cx, cy), at most `maxW` wide and `maxH` tall: label, then note.
  const block = (out: LayoutNode[], label: string, note: string, cx: number, cy: number, maxW: number, maxH: number, part: string, align: 'center' | 'start' | 'end' = 'center', anchorX?: number) => {
    const w = Math.max(10, maxW)
    const labelLines = clamp(Math.floor(maxH / lineH(labelS)), 1, 2)
    const lh = linesHeight(ctx, label, labelS, w, labelLines)
    const room = maxH - lh - 2
    const nl = note && room >= lineH(noteS) ? Math.min(3, Math.floor(room / lineH(noteS))) : 0
    const nh = nl > 0 ? linesHeight(ctx, note, noteS, w, nl) : 0
    const total = lh + (nh ? 2 + nh : 0)
    const top = cy - total / 2
    const x = anchorX ?? cx - w / 2
    out.push(...placeLines(ctx, label, labelS, { x, y: top, width: w }, align, labelLines, `${part}.label`).nodes)
    if (nh) out.push(...placeLines(ctx, note, noteS, { x, y: top + lh + 2, width: w }, align, nl, `${part}.note`).nodes)
  }

  // ---- sets -------------------------------------------------------------------------------------
  sets.forEach((s, i) => {
    const cc = circles[i]
    const color = rampColor(ctx, 'series', i, N)
    const kids: LayoutNode[] = []
    kids.push({ k: 'group', opacity, box: { x: 0, y: 0, width: W, height: H }, children: [{ k: 'rect', part: `disc[${i}]`, box: box(cc), fill: { type: 'solid', color }, radius: cc.r }] })
    kids.push({ k: 'rect', part: `ring[${i}]`, box: box(cc), stroke: { color, width: 3 }, radius: cc.r })
    if (!outside) {
      if (N === 2) {
        const dir = i === 0 ? -1 : 1
        const regionW = circles[1].cx - circles[0].cx // = d*r: width of the circle's own crescent
        block(kids, s.label, s.text, cc.cx + dir * (cc.r - regionW / 2), cc.cy, regionW * 0.86, cc.r * 1.1, `text[${i}]`)
      } else {
        const ux = (cc.cx - centroid.x) / Math.hypot(cc.cx - centroid.x, cc.cy - centroid.y)
        const uy = (cc.cy - centroid.y) / Math.hypot(cc.cx - centroid.x, cc.cy - centroid.y)
        block(kids, s.label, s.text, cc.cx + ux * 0.5 * r, cc.cy + uy * 0.5 * r, r * 1.05, r * 0.8, `text[${i}]`)
      }
    } else {
      const gap = 16
      if (N === 2 || i < 2) {
        const left = i === 0
        const w = Math.max(40, marginX - gap)
        block(kids, s.label, s.text, 0, cc.cy, w, availH * 0.5, `text[${i}]`, left ? 'end' : 'start', left ? cc.cx - cc.r - gap - w : cc.cx + cc.r + gap)
      } else {
        const w = Math.min(W * 0.6, 420)
        block(kids, s.label, s.text, cc.cx, cc.cy + cc.r + gap + bandB / 2 - gap / 2, w, Math.max(lineH(labelS), bandB - gap), `text[${i}]`)
      }
    }
    nodes.push({ k: 'group', part: `set[${i}]`, box: { x: 0, y: 0, width: W, height: H }, children: kids })
  })

  // ---- overlap texts ---------------------------------------------------------------------------
  const over: LayoutNode[] = []
  if (N === 2) {
    const lens = 2 * r - (circles[1].cx - circles[0].cx)
    if (overlapText) block(over, overlapText, '', (circles[0].cx + circles[1].cx) / 2, circles[0].cy, lens * 0.8, r * 0.9, 'overlap-text')
  } else {
    if (overlapText) block(over, overlapText, '', centroid.x, centroid.y, r * 0.5, r * 0.4, 'overlap-text')
    // Pair lenses: AB (away from C), BC (away from A), AC (away from B).
    const pairIdx: Array<[number, number, number]> = [[0, 1, 2], [1, 2, 0], [0, 2, 1]]
    pairIdx.forEach(([a, b, third], k) => {
      const t = pairs[k]
      if (!t || !t.trim()) return
      const mx = (circles[a].cx + circles[b].cx) / 2
      const my = (circles[a].cy + circles[b].cy) / 2
      const dx = mx - circles[third].cx
      const dy = my - circles[third].cy
      const len = Math.hypot(dx, dy) || 1
      const push = 0.45 * r
      block(over, t, '', mx + (dx / len) * push, my + (dy / len) * push, r * 0.6, r * 0.4, `pair[${k}]`)
    })
  }
  if (over.length) nodes.push({ k: 'group', part: 'overlap', box: { x: 0, y: 0, width: W, height: H }, children: over })
  void smallS
  return root(ctx, nodes)
}

export function capacity(props: VennProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ sets: { max: VENN_MAX, used: asArr(props.sets).length } }, true, [
    { kind: 'truncate', slot: 'sets' },
    { kind: 'reflow', to: 'tls.d.compare-table' },
  ])
}
