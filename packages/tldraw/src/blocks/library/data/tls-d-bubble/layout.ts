/**
 * Pure layout for tls.d.bubble — scatter positions, circle AREA proportional to the third value.
 *
 * Radius = sqrt(value / max) * rMax (area, not radius, is what the eye reads), with a floor so a
 * tiny value is still visible. Bubbles are drawn largest first so small ones stay on top, in one
 * half-transparent group so overlaps stay legible. Labels go inside a bubble when they fit, else
 * beside it, and a label that would collide is skipped.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { BubbleProps } from './schema'
import { BUBBLE_MAX_POINTS } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, dot, emptyState, faded, fmtNum, lineH, mutedStyle, niceAxis, numOrNull, oneLine, readableOn, root, str,
  textAligned, TEXT_SLACK, valueAxisLeft,
} from '../_chart/kit'

interface Bp {
  x: number
  y: number
  r: number
  label: string
  idx: number
}

export function layout(props: BubbleProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const pts: Bp[] = []
  asArr<Record<string, unknown>>(props.points)
    .slice(0, BUBBLE_MAX_POINTS)
    .forEach((p, idx) => {
      const x = numOrNull(p?.x)
      const y = numOrNull(p?.y)
      const r = numOrNull(p?.r)
      if (x !== null && y !== null && r !== null && r >= 0) pts.push({ x, y, r, label: str(p.label), idx })
    })
  if (pts.length === 0 || !pts.some((p) => p.r > 0)) return emptyState(ctx)

  const c = chartColors(ctx)
  const nodes: LayoutNode[] = []
  const ls = mutedStyle(ctx, 'footnote')
  const lh = lineH(ls)
  const maxR = Math.max(...pts.map((p) => p.r))

  // Plot geometry: the size legend takes a column on the right.
  const rMaxPx = clamp(Math.min(W, H) * 0.12, 14, 64)
  const legendW = props.sizeLegend === true ? Math.ceil(rMaxPx * 2 + 90) : 0
  const ax = niceAxis(Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x)), 5)
  const top = lh / 2 + 4
  const xAxisH = lh * 1.5 + 8
  // Pad the y domain by the room the biggest circle needs, so no bubble crosses the plot edge.
  const yLo = Math.min(...pts.map((p) => p.y))
  const yHi = Math.max(...pts.map((p) => p.y))
  const plotH = Math.max(1, H - top - xAxisH)
  const padY = ((yHi - yLo) || Math.abs(yHi) || 1) * (rMaxPx / Math.max(1, plotH - 2 * rMaxPx)) * 1.15
  const ay = niceAxis(yLo - padY, yHi + padY, 5)
  const gridlines = props.gridlines !== 'none'
  const yaxis = valueAxisLeft(ctx, { x: 0, y: top, width: Math.max(1, W - legendW), height: Math.max(0, H - top - xAxisH) }, ay, { format: props.format, gridlines, rightPad: rMaxPx * 0.5 + 6, c })
  nodes.push(...yaxis.nodes)
  const plot = yaxis.plot
  const xspan = ax.max - ax.min || 1
  // Keep bubbles inside the plot horizontally: inset the x range by the largest radius.
  const inset = Math.min(rMaxPx, plot.width * 0.15)
  const px = (v: number) => plot.x + inset + (plot.width - 2 * inset) * clamp((v - ax.min) / xspan, 0, 1)
  const py = yaxis.y
  const radius = (v: number) => (v <= 0 ? 0 : Math.max(5, Math.sqrt(v / maxR) * rMaxPx))

  const xt = ax.ticks.map((t) => fmtNum(t, props.format))
  const maxW = Math.max(...xt.map((t) => ctx.measureText(t, ls).width)) * TEXT_SLACK
  const spacing = ax.ticks.length > 1 ? (plot.width - 2 * inset) / (ax.ticks.length - 1) : plot.width
  const stride = Math.max(1, Math.ceil((maxW + 8) / Math.max(1, spacing)))
  ax.ticks.forEach((t, i) => {
    if (i % stride !== 0) return
    const tw = ctx.measureText(xt[i], ls).width * 1.12
    nodes.push(...textAligned(ctx, xt[i], ls, { x: clamp(px(t) - tw / 2, 0, Math.max(0, W - legendW - tw)), y: plot.y + plot.height + lh / 2 + 6, width: tw }, 'start', `xtick[${i}]`).nodes.slice(0, 1))
  })

  // Bubbles, biggest first, in one faded group.
  const order = pts.slice().sort((a, b) => b.r - a.r || a.idx - b.idx)
  const bubbles = order.filter((p) => p.r > 0).map((p) => dot(px(p.x), py(p.y), radius(p.r), c.accent, `point[${p.idx}]`, c.surface))
  nodes.push(faded(ctx, 0.72, bubbles))

  // Labels.
  const placed: Array<{ x: number; y: number; w: number; h: number }> = []
  const labelStyle = { ...ls, color: c.text }
  for (const p of order) {
    if (!p.label || p.r <= 0) continue
    const rr = radius(p.r)
    const w = Math.min(plot.width * 0.4, ctx.measureText(p.label, labelStyle).width * 1.12 + 2)
    const cx = px(p.x)
    const cy = py(p.y)
    const inside = w * 1.1 <= 2 * rr && lh <= 2 * rr
    let x = inside ? cx - w / 2 : cx + rr + 4
    if (!inside && x + w > W - legendW) x = cx - rr - 4 - w
    const y = cy - lh / 2
    const box = { x, y, w, h: lh }
    if (x < 0 || placed.some((b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)) continue
    placed.push(box)
    const node = oneLine(ctx, p.label, inside ? { ...labelStyle, color: readableOn(c.text, c.accent) } : labelStyle, { x, y, width: w }, `label[${p.idx}]`)
    nodes.push(node)
  }

  // Size legend: nested outline circles sharing a baseline, with their values.
  if (props.sizeLegend === true) {
    const lx = W - legendW + 12
    const baseY = plot.y + plot.height - 4
    const cxL = lx + rMaxPx
    const levels = [maxR, maxR / 2, maxR / 5].filter((v) => v > 0)
    nodes.push(...textAligned(ctx, 'Size', ls, { x: lx, y: baseY - 2 * rMaxPx - lh * 2 - 8, width: 60 }, 'start', 'sizelegend.title').nodes.slice(0, 1))
    let lastTop = Infinity
    levels.forEach((v, k) => {
      const rr = radius(v)
      const cyL = baseY - rr
      const tip = cyL - rr
      nodes.push({
        k: 'rect',
        part: `sizelegend[${k}]`,
        box: { x: cxL - rr, y: tip, width: 2 * rr, height: 2 * rr },
        stroke: { color: c.muted, width: 2 },
        radius: rr,
      })
      // A value label only when it has a line of its own (nested circles crowd on small charts).
      if (lastTop - tip >= lh + 2) {
        nodes.push(...textAligned(ctx, fmtNum(v, props.format), ls, { x: cxL + rMaxPx + 6, y: tip - lh / 2, width: ctx.measureText(fmtNum(v, props.format), ls).width * 1.12 }, 'start', `sizelegend[${k}].label`).nodes.slice(0, 1))
        lastTop = tip
      }
    })
  }
  return root(ctx, nodes)
}

export function capacity(props: BubbleProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf({ points: { max: BUBBLE_MAX_POINTS, used: asArr(props.points).length } }, true, [{ kind: 'truncate', slot: 'points' }])
}
