/**
 * Pure layout for tls.g.target — 2-5 concentric rings, the core first (the strongest colour) and
 * outward; each ring is its own annulus (no ring paints over another), the labels and notes in a
 * column beside the target with a leader from each ring (`labels: side`), or the ring names on
 * the rings themselves (`labels: none`).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { TargetProps } from './schema'
import { TARGET_MAX } from './schema'
import { asArr, capacityOf, chartColors, dot, emptyState, enumOf, lineH, linesHeight, mutedStyle, objs, onColor, pathNode, placeLines, polyline, rampColor, root, str, strokePath, style } from '../_kit'
import { slotsByIndex } from '../_motion'

const RING_GAP = 3
const f = (v: number) => Math.round(v * 100) / 100

/** A circle as four cubic segments from 12 o'clock, clockwise (`cw`) or not — no arc commands, so
 *  its bounds read from its points and the render treatment can sketch it. */
export function circlePath(cx: number, cy: number, r: number, cw = true): string {
  const k = 0.5523 * r
  const s = cw ? 1 : -1
  const p = [
    [cx, cy - r],
    [cx + s * r, cy],
    [cx, cy + r],
    [cx - s * r, cy],
  ]
  const c = (a: number[], b: number[], i: number) => {
    // control points along the tangents at a and b
    const ta = [[s * k, 0], [0, k], [-s * k, 0], [0, -k]][i]
    const tb = [[0, -k], [s * k, 0], [0, k], [-s * k, 0]][i]
    return `C${f(a[0] + ta[0])} ${f(a[1] + ta[1])} ${f(b[0] + tb[0])} ${f(b[1] + tb[1])} ${f(b[0])} ${f(b[1])}`
  }
  return `M${f(p[0][0])} ${f(p[0][1])}` + [0, 1, 2, 3].map((i) => c(p[i], p[(i + 1) % 4], i)).join('') + 'Z'
}

/** An annulus (a disc when `rInner` is 0): the outer circle clockwise, the inner one back. */
export function annulusPath(cx: number, cy: number, rOuter: number, rInner: number): string {
  return circlePath(cx, cy, rOuter, true) + (rInner > 0 ? circlePath(cx, cy, rInner, false) : '')
}

export function layout(props: TargetProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const rings = objs(props.rings)
    .slice(0, TARGET_MAX)
    .map((r) => ({ label: str(r.label), text: str(r.text) }))
  const N = rings.length
  if (N < 1) return emptyState(ctx, 'No rings')
  const c = chartColors(ctx)
  const fillMode = enumOf(props.fill, ['gradient', 'single', 'series'] as const, 'gradient')
  const side = enumOf(props.labels, ['side', 'none'] as const, 'side') === 'side'
  const sp = ctx.tokens.space
  const labelS = style(ctx, 'subheading', c.text)
  const noteS = mutedStyle(ctx, 'caption')

  const D = Math.max(8, side ? Math.min(H, W * 0.46) : Math.min(H, W))
  const R = D / 2 - 1
  const cx = side ? D / 2 : W / 2
  const cy = H / 2
  const radius = (k: number) => (R * (k + 1)) / N
  const inner = (k: number) => (k === 0 ? 0 : radius(k - 1) + RING_GAP / 2)
  const mid = (k: number) => (k === 0 ? radius(0) * 0.5 : (inner(k) + radius(k)) / 2)

  const nodes: LayoutNode[] = []
  rings.forEach((_, k) => {
    const fill = rampColor(ctx, fillMode, k, N)
    nodes.push(pathNode(ctx, annulusPath(cx, cy, radius(k) - (k === N - 1 ? 0 : RING_GAP / 2), inner(k)), `ring[${k}]`, { fill }))
  })

  if (side) {
    const colX = D + Math.max(32, sp.lg)
    const colW = Math.max(20, W - colX)
    // rows top to bottom, core first; each row as tall as its text, spread over the target's height
    const rows = rings.map((r) => {
      const lh = linesHeight(ctx, r.label, labelS, colW, 2)
      const nh = r.text ? linesHeight(ctx, r.text, noteS, colW, 2) : 0
      return { lh, nh, h: lh + (nh ? sp['3xs'] + nh : 0) }
    })
    const total = rows.reduce((a, r) => a + r.h, 0)
    const room = Math.min(H, Math.max(D, total))
    const gap = N > 1 ? Math.max(sp['2xs'], (room - total) / (N - 1)) : 0
    // drop notes when the rows do not fit at all
    const fits = total + (N - 1) * sp['2xs'] <= H
    let y = Math.max(0, (H - (total + (N - 1) * gap)) / 2)
    if (!fits) y = 0
    rings.forEach((r, k) => {
      const row = rows[k]
      const rowY = y
      const labelLines = fits ? 2 : 1
      const l = placeLines(ctx, r.label, labelS, { x: colX, y: rowY, width: colW }, 'start', labelLines, `label[${k}]`)
      nodes.push(...l.nodes)
      if (fits && r.text) nodes.push(...placeLines(ctx, r.text, noteS, { x: colX, y: rowY + l.height + sp['3xs'], width: colW }, 'start', 2, `note[${k}]`).nodes)
      // the leader: from the ring's band, at the row's height where the band reaches it
      const ly = rowY + Math.min(l.height, lineH(labelS)) / 2
      const rm = mid(k)
      const dy = Math.max(-rm * 0.85, Math.min(rm * 0.85, ly - cy))
      const px = cx + Math.sqrt(Math.max(0, rm * rm - dy * dy))
      const py = cy + dy
      const ink = onColor(ctx, rampColor(ctx, fillMode, k, N))
      nodes.push(strokePath(ctx, polyline([{ x: px, y: py }, { x: Math.max(px + 8, colX - 14), y: ly }, { x: colX - 6, y: ly }]), `leader[${k}]`, c.text, 1.5))
      nodes.push(dot(px, py, 4, ink, `pin[${k}]`, c.text))
      y += (fits ? row.h : lineH(labelS)) + (fits ? gap : sp['3xs'])
    })
  } else {
    // ring names on the rings: the core's in its centre, the others at the top of their band
    rings.forEach((r, k) => {
      const ink = onColor(ctx, rampColor(ctx, fillMode, k, N))
      const band = k === 0 ? radius(0) * 2 : radius(k) - inner(k)
      let s = { ...labelS, color: ink }
      if (lineH(s) > band * 0.8) s = { ...s, size: Math.max(1, (band * 0.8) / s.lineHeight) }
      const w = k === 0 ? radius(0) * 1.5 : Math.max(10, 2 * Math.sqrt(Math.max(0, inner(k) * inner(k) - (lineH(s) / 2) ** 2)) * 0.9)
      const yy = k === 0 ? cy - lineH(s) / 2 : cy - mid(k) - lineH(s) / 2
      nodes.push(...placeLines(ctx, r.label, s, { x: cx - w / 2, y: yy, width: w }, 'center', 1, `label[${k}]`).nodes)
    })
  }

  return root(
    ctx,
    slotsByIndex(nodes, N, { width: W, height: H }, [
      { name: 'band', match: /^ring\[(\d+)\]$/, tight: true },
      { name: 'cap', match: /^(?:label|note|leader|pin)\[(\d+)\](?:\.\d+)?$/ },
    ])
  )
}

export function capacity(props: TargetProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ rings: { max: TARGET_MAX, used: asArr(props.rings).length } }, true, [
    { kind: 'truncate', slot: 'rings' },
    { kind: 'paginate' },
  ])
}
