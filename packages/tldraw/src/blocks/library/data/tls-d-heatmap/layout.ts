/**
 * Pure layout for tls.d.heatmap — rows by columns of cells shaded by value.
 *
 * `accent` ramp: one hue from a faint tint (the minimum) to the full accent (the maximum).
 * `diverging`: negative values toward the `negative` role, positive toward `positive`, zero a quiet
 * neutral, intensity by |value| over the largest magnitude. Colours are blends of roles. Values
 * print inside the cells (all or none, when every one fits) in whichever of surface / text reads
 * on the cell. A legend strip (min, five swatches, max) is drawn when the height allows.
 *
 * Parts: `row[i]`, `col[j]`, `cell[i].c<j>` (+ `.v`), `legend`, `legend.min`, `legend.max`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { HeatmapProps } from './schema'
import { HEATMAP_MAX } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, ellipsize, emptyState, enumOf, fmtNum, lineH, mutedStyle, numOrNull, onColor, root, solidRect, str, style, textAligned, tintOf, TEXT_SLACK,
} from '../_chart/kit'
import { withNumberMetrics } from '../_table/kit'

const MIN_CELL_W = 28
const MIN_CELL_H = 24

export function layout(props: HeatmapProps, ctx0: LayoutContext): LayoutNode {
  const ctx = withNumberMetrics(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const rows = asArr<unknown>(props.rows).slice(0, HEATMAP_MAX).map(str)
  const cols = asArr<unknown>(props.cols).slice(0, HEATMAP_MAX).map(str)
  const grid = rows.map((_, r) => cols.map((__, c) => numOrNull(asArr<unknown>(asArr<unknown>(props.values)[r])[c])))
  const nums = grid.flat().filter((v): v is number => v !== null)
  if (rows.length === 0 || cols.length === 0 || nums.length === 0) return emptyState(ctx)

  const c = chartColors(ctx)
  const sp = ctx.tokens.space
  const diverging = enumOf(props.ramp, ['accent', 'diverging'] as const, 'accent') === 'diverging'
  const ls = mutedStyle(ctx, 'caption')
  const vs = style(ctx, 'caption', c.text)
  const lh = lineH(ls)
  const gap = 4
  const lo = Math.min(...nums)
  const hi = Math.max(...nums)
  const mag = Math.max(Math.abs(lo), Math.abs(hi))
  const pos = ctx.resolveColor('positive').color
  const neg = ctx.resolveColor('negative').color
  const zero = tintOf(c.surface, c.line, 0.22)
  const fillAt = (v: number): string => {
    if (diverging) {
      const t = mag > 0 ? clamp(Math.abs(v) / mag, 0, 1) : 0
      return tintOf(zero, v >= 0 ? pos : neg, 0.12 + 0.88 * t)
    }
    const t = hi > lo ? (v - lo) / (hi - lo) : 0.5
    return tintOf(c.surface, c.accent, 0.1 + 0.9 * t)
  }

  const legendH = H >= 240 ? lh + sp.xs : 0
  const labelW = Math.min(W * 0.26, Math.ceil(Math.max(...rows.map((r) => ctx.measureText(r, ls).width)) * TEXT_SLACK) + 2)
  const headH = lh + 4
  const gx = labelW + sp.xs
  const gw = Math.max(1, W - gx)
  const gh = Math.max(1, H - headH - legendH - (legendH > 0 ? sp.xs : 0))
  const cw = Math.max(1, (gw - gap * (cols.length - 1)) / cols.length)
  const ch = clamp((gh - gap * (rows.length - 1)) / rows.length, 1, 96)
  const nodes: LayoutNode[] = []

  // Labels thin out (every n-th) rather than overlap when the cells are narrow or short.
  const colStride = Math.max(1, Math.ceil((Math.max(...cols.map((l) => ctx.measureText(l, ls).width)) * TEXT_SLACK) / (cw + gap)))
  const rowStride = Math.max(1, Math.ceil((lh * 1.05) / (ch + gap)))
  cols.forEach((label, j) => {
    if (j % colStride !== 0) return
    const text = ellipsize(ctx, label, ls, Math.max(1, cw / TEXT_SLACK))
    const m = textAligned(ctx, text, ls, { x: gx + j * (cw + gap), y: 0, width: cw }, 'center', `col[${j}]`)
    nodes.push(...m.nodes.slice(0, 1))
  })
  rows.forEach((label, i) => {
    if (i % rowStride !== 0) return
    const y = headH + i * (ch + gap)
    const text = ellipsize(ctx, label, ls, Math.max(1, labelW / TEXT_SLACK))
    nodes.push(...textAligned(ctx, text, ls, { x: 0, y: y + (ch - lh) / 2, width: labelW }, 'start', `row[${i}]`).nodes.slice(0, 1))
  })

  const texts = grid.map((r) => r.map((v) => (v === null ? '' : fmtNum(v, props.format))))
  const widest = Math.max(...texts.flat().map((t) => ctx.measureText(t, vs).width), 0)
  const showValues = props.showValues !== false && widest * TEXT_SLACK + 6 <= cw && lineH(vs) <= ch
  grid.forEach((r, i) =>
    r.forEach((v, j) => {
      const box = { x: gx + j * (cw + gap), y: headH + i * (ch + gap), width: cw, height: ch }
      if (v === null) {
        nodes.push({ k: 'rect', part: `cell[${i}].c${j}`, box, stroke: { color: c.line, width: 1 } })
        return
      }
      const fill = fillAt(v)
      nodes.push(solidRect(box, fill, `cell[${i}].c${j}`, 3))
      if (showValues) {
        const ink = onColor(ctx, fill)
        nodes.push(...textAligned(ctx, texts[i][j], { ...vs, color: ink }, { x: box.x, y: box.y + (ch - lineH(vs)) / 2, width: cw }, 'center', `cell[${i}].c${j}.v`).nodes.slice(0, 1))
      }
    })
  )

  if (legendH > 0) {
    // Right under the grid (cells are capped at 96 tall, so the box bottom can be far below it).
    const gridBottom = headH + rows.length * ch + (rows.length - 1) * gap
    const y = Math.min(H - lh - 4, gridBottom + sp.sm)
    const sw = 28
    const swH = Math.min(14, lineH(ls) - 4)
    const loT = fmtNum(lo, props.format)
    const hiT = fmtNum(hi, props.format)
    const loW = Math.ceil(ctx.measureText(loT, ls).width * TEXT_SLACK) + 2
    const hiW = Math.ceil(ctx.measureText(hiT, ls).width * TEXT_SLACK) + 2
    const total = loW + sp.xs + sw * 5 + sp.xs + hiW
    const x0 = W - total
    if (x0 >= gx) {
      nodes.push(...textAligned(ctx, loT, ls, { x: x0, y, width: loW }, 'start', 'legend.min').nodes.slice(0, 1))
      for (let k = 0; k < 5; k++) {
        const v = lo + ((hi - lo) * k) / 4
        nodes.push(solidRect({ x: x0 + loW + sp.xs + k * sw, y: y + (lineH(ls) - swH) / 2, width: sw, height: swH }, fillAt(v), `legend.s${k}`))
      }
      nodes.push(...textAligned(ctx, hiT, ls, { x: x0 + loW + sp.xs + sw * 5 + sp.xs, y, width: hiW }, 'start', 'legend.max').nodes.slice(0, 1))
    }
  }
  return root(ctx, nodes)
}

export function capacity(props: HeatmapProps, box: Size, ctx: LayoutContext): CapacityReport {
  void ctx
  const rows = asArr(props.rows).length
  const cols = asArr(props.cols).length
  const roomRows = Math.max(1, Math.floor((box.height - 60) / (MIN_CELL_H + 4)))
  const roomCols = Math.max(1, Math.floor((box.width * 0.75) / (MIN_CELL_W + 4)))
  return capacityOf(
    { rows: { max: Math.min(HEATMAP_MAX, roomRows), used: rows }, columns: { max: Math.min(HEATMAP_MAX, roomCols), used: cols } },
    true,
    [{ kind: 'truncate', slot: 'rows' }, { kind: 'truncate', slot: 'cols' }]
  )
}
