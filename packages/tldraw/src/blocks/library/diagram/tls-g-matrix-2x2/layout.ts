/**
 * Pure layout for tls.g.matrix-2x2 — four quadrants in a grid, two labelled axes, optional points.
 *
 * Left column: y-axis high label at the top, low label at the bottom, title in between. Bottom row:
 * x low at the left, high at the right, title centred. Quadrants are TL, TR, BL, BR; the
 * highlighted one gets a stronger accent tint (or, in `lines` style, the only fill). Plotted items
 * are dots with a label that is nudged right/left/below/above to avoid other text.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box, CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import type { MatrixProps } from './schema'
import { MATRIX_MAX_ITEMS } from './schema'
import { TEXT_SLACK, arrowHead, asArr, capacityOf, chartColors, clamp, dot, emptyState, enumOf, linesHeight, lineH, mutedStyle, numOrNull, objs, placeLines, root, solidRect, str, style, tintOf } from '../_kit'

const GAP = 8
const HL = ['TL', 'TR', 'BL', 'BR'] as const

const hit = (a: Box, b: Box, pad = 2) => a.x < b.x + b.width + pad && b.x < a.x + a.width + pad && a.y < b.y + b.height + pad && b.y < a.y + a.height + pad

export function layout(props: MatrixProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const c = chartColors(ctx)
  const ax = objs([props.xAxis])[0] ?? {}
  const ay = objs([props.yAxis])[0] ?? {}
  const quads = objs(props.quadrants).slice(0, 4)
  while (quads.length < 4) quads.push({})
  if (!quads.some((q) => str(q.label))) return emptyState(ctx, 'No quadrants')
  const hl = HL.indexOf(enumOf(props.highlight, ['none', ...HL] as const, 'none') as (typeof HL)[number])
  const lines = enumOf(props.style, ['tinted', 'lines'] as const, 'tinted') === 'lines'
  const showItems = isShown(props, 'showItems')
  const showTitles = isShown(props, 'showAxisTitles')
  const labelS = style(ctx, 'caption', c.text)
  const noteS = mutedStyle(ctx, 'footnote')
  const axisS = mutedStyle(ctx, 'footnote')
  const titleS = style(ctx, 'footnote', c.text)

  const LW = clamp(W * 0.13, 70, 150)
  const BH = lineH(axisS) * 2 + 8
  const gx = LW + 10
  const gy = 0
  const gw = Math.max(20, W - gx)
  const gh = Math.max(20, H - BH - 10)
  const qw = (gw - GAP) / 2
  const qh = (gh - GAP) / 2
  const nodes: LayoutNode[] = []
  const obstacles: Box[] = []
  /** Quadrant notes, the lowest-priority text: a point label may displace one when nothing else is free. */
  const noteTexts: Array<{ box: Box; nodes: LayoutNode[] }> = []

  // Quadrants.
  const pad = clamp(Math.min(qw, qh) * 0.08, 8, 18)
  quads.forEach((q, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const box: Box = { x: gx + col * (qw + GAP), y: gy + row * (qh + GAP), width: qw, height: qh }
    const on = i === hl
    if (!lines || on) {
      nodes.push({
        k: 'rect',
        part: `q[${i}]`,
        box,
        fill: { type: 'solid', color: on ? tintOf(c.surface, c.accent, lines ? 0.14 : 0.26) : tintOf(c.surface, c.line, 0.35) },
        ...(on ? { stroke: { color: c.accent, width: 2 } } : {}),
        radius: 14,
      })
    } else {
      nodes.push({ k: 'rect', part: `q[${i}]`, box, fill: { type: 'solid', color: c.surface }, radius: 14 })
    }
    const tw = Math.max(10, qw - 2 * pad)
    const lh = str(q.label) ? linesHeight(ctx, str(q.label), labelS, tw, 1) : 0
    const room = Math.floor((qh - 2 * pad - lh - 2) / lineH(noteS))
    const nl = str(q.text) ? clamp(room, 0, 3) : 0
    if (lh) {
      const p = placeLines(ctx, str(q.label), { ...labelS, color: on ? c.text : c.text }, { x: box.x + pad, y: box.y + pad, width: tw }, 'start', 1, `qlabel[${i}]`)
      nodes.push(...p.nodes)
      obstacles.push({ x: box.x + pad, y: box.y + pad, width: tw, height: p.height })
    }
    if (nl > 0) {
      const p = placeLines(ctx, str(q.text), noteS, { x: box.x + pad, y: box.y + pad + lh + 2, width: tw }, 'start', nl, `qtext[${i}]`)
      nodes.push(...p.nodes)
      const tb = { x: box.x + pad, y: box.y + pad + lh + 2, width: tw, height: p.height }
      obstacles.push(tb)
      noteTexts.push({ box: tb, nodes: p.nodes })
    }
  })

  // Crossing lines in `lines` style.
  if (lines) {
    nodes.push(solidRect({ x: gx + qw + GAP / 2 - 1, y: gy, width: 2, height: gh }, c.line, 'cross[v]'))
    nodes.push(solidRect({ x: gx, y: gy + qh + GAP / 2 - 1, width: gw, height: 2 }, c.line, 'cross[h]'))
  }

  // Axes: an L of two thin bars with arrow heads at the high ends.
  const axX = gx - 6
  const axY = gy + gh + 6
  nodes.push(solidRect({ x: axX - 1.5, y: gy + 8, width: 3, height: gh - 8 + 6 }, c.muted, 'axes[y]'))
  nodes.push(solidRect({ x: gx - 6, y: axY - 1.5, width: gw + 6 - 8, height: 3 }, c.muted, 'axes[x]'))
  nodes.push(arrowHead(ctx, { x: axX, y: gy }, 0, -1, 12, c.muted, 'axes[yhead]'))
  nodes.push(arrowHead(ctx, { x: gx + gw, y: axY }, 1, 0, 12, c.muted, 'axes[xhead]'))

  // Y labels (right-aligned in the left column): high at top, low at bottom, title in the middle.
  const yw = Math.max(10, LW - 4)
  const yHigh = str(ay.high)
  const yLow = str(ay.low)
  const yTitle = showTitles ? str(ay.title) : ''
  const place = (text: string, s: typeof axisS, y: number, anchor: 'top' | 'bottom' | 'mid', name: string) => {
    const h = linesHeight(ctx, text, s, yw, 2)
    const top = anchor === 'top' ? y : anchor === 'bottom' ? y - h : y - h / 2
    nodes.push(...placeLines(ctx, text, s, { x: 0, y: top, width: yw }, 'end', 2, name).nodes)
  }
  if (yHigh) place(yHigh, axisS, gy + 4, 'top', 'axis-label[yhigh]')
  if (yLow) place(yLow, axisS, gy + gh - 4, 'bottom', 'axis-label[ylow]')
  if (yTitle) place(yTitle, titleS, gy + gh / 2, 'mid', 'axis-title[y]')

  // X labels under the grid.
  const xy = axY + 8
  const xw = Math.max(10, gw / 3 - 8)
  const xHigh = str(ax.high)
  const xLow = str(ax.low)
  const xTitle = showTitles ? str(ax.title) : ''
  if (xLow) nodes.push(...placeLines(ctx, xLow, axisS, { x: gx, y: xy, width: xw }, 'start', 1, 'axis-label[xlow]').nodes)
  if (xHigh) nodes.push(...placeLines(ctx, xHigh, axisS, { x: gx + gw - xw, y: xy, width: xw }, 'end', 1, 'axis-label[xhigh]').nodes)
  if (xTitle) nodes.push(...placeLines(ctx, xTitle, titleS, { x: gx + gw / 2 - xw / 2, y: xy, width: xw }, 'center', 1, 'axis-title[x]').nodes)

  // Plotted items.
  if (showItems) {
    const R = 8
    const placed: Box[] = [...obstacles]
    objs(props.items)
      .slice(0, MATRIX_MAX_ITEMS)
      .forEach((it, i) => {
        const fx = numOrNull(it.x)
        const fy = numOrNull(it.y)
        if (fx === null || fy === null || !str(it.label)) return
        const px = gx + R + 4 + clamp(fx, 0, 1) * (gw - 2 * (R + 4))
        const py = gy + R + 4 + (1 - clamp(fy, 0, 1)) * (gh - 2 * (R + 4))
        const text = str(it.label)
        const tw = Math.min(200, Math.ceil(placeLines(ctx, text, noteS, { x: 0, y: 0, width: 200 }, 'start', 1, 'probe').width) + 2)
        const th = lineH(noteS)
        const dotBox: Box = { x: px - R, y: py - R, width: 2 * R, height: 2 * R }
        const cands: Box[] = [
          { x: px + R + 6, y: py - th / 2, width: tw, height: th },
          { x: px - R - 6 - tw, y: py - th / 2, width: tw, height: th },
          { x: px - tw / 2, y: py + R + 4, width: tw, height: th },
          { x: px - tw / 2, y: py - R - 4 - th, width: tw, height: th },
          ...[1, -1, 2, -2, 3, -3].flatMap((k) => [
            { x: px + R + 6, y: py - th / 2 + k * (th + 2), width: tw, height: th },
            { x: px - R - 6 - tw, y: py - th / 2 + k * (th + 2), width: tw, height: th },
          ]),
        ]
        const inGrid = (b: Box) => b.x >= gx && b.x + b.width <= gx + gw && b.y >= gy && b.y + b.height <= gy + gh
        const free = (b: Box) => inGrid(b) && !placed.some((p) => hit(b, p, 1)) && !hit(b, dotBox, 0)
        let pick = cands.find(free)
        if (!pick) {
          // Nothing is free: let the label displace the quadrant note it lands on.
          const softFree = (b: Box) => inGrid(b) && !placed.some((p) => !noteTexts.some((n) => n.box === p) && hit(b, p, 1)) && !hit(b, dotBox, 0)
          pick = cands.find(softFree)
          if (pick) {
            for (const n of noteTexts) {
              if (hit(pick, n.box, 1)) {
                for (const nn of n.nodes) {
                  const at = nodes.indexOf(nn)
                  if (at >= 0) nodes.splice(at, 1)
                }
                placed.splice(placed.indexOf(n.box), 1)
              }
            }
          }
        }
        pick = pick ?? cands.find(inGrid) ?? cands[0]
        placed.push(pick, dotBox)
        nodes.push(dot(px, py, R, c.accent, `item[${i}]`, c.surface))
        nodes.push(...placeLines(ctx, text, { ...noteS, color: c.text }, { x: pick.x, y: pick.y, width: tw + 2 }, 'start', 1, `item-label[${i}]`).nodes)
      })
  }
  void TEXT_SLACK
  return root(ctx, nodes)
}

export function capacity(props: MatrixProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf(
    {
      quadrants: { max: 4, used: asArr(props.quadrants).length },
      items: { max: MATRIX_MAX_ITEMS, used: asArr(props.items).length },
    },
    asArr(props.quadrants).length === 4,
    [{ kind: 'truncate', slot: 'items' }, { kind: 'paginate' }]
  )
}
