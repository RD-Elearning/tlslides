/**
 * Pure layout for tls.g.pyramid — 3 to 6 levels stacked into a pyramid (or an inverted one).
 *
 * The outline is one continuous slope; each level is the slice of it between two heights, with a
 * small gap between levels. The tip level is a triangle, so its text sits at its wide end. Labels
 * go inside the level when they fit its width at the text line, otherwise they move to the side
 * column next to the note (`notes: side`). `inside` puts label and note inside (clipped);
 * `none` shows labels only, inside.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { trapezoidPath } from '../../../layout/diagram'
import type { PyramidProps } from './schema'
import { PYRAMID_MAX } from './schema'
import { TEXT_SLACK, asArr, capacityOf, chartColors, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, onColor, pathNode, placeLines, rampColor, root, solidRect, str, style } from '../_kit'

const GAP = 6
const PAD = 8

export function layout(props: PyramidProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const levels = objs(props.levels)
    .slice(0, PYRAMID_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text) }))
  const N = levels.length
  if (N < 1) return emptyState(ctx, 'No levels')
  const c = chartColors(ctx)
  const up = enumOf(props.direction, ['up', 'down'] as const, 'up') === 'up'
  const noteMode = enumOf(props.notes, ['side', 'inside', 'none'] as const, 'side')
  const fillMode = enumOf(props.fill, ['gradient', 'series', 'single'] as const, 'gradient')
  const labelS = style(ctx, 'caption', c.text)
  const noteS = mutedStyle(ctx, 'footnote')

  const side = noteMode === 'side'
  const rowH = Math.min(130, Math.max(1, (H - (N - 1) * GAP) / N))
  const total = N * rowH + (N - 1) * GAP
  const y0 = Math.max(0, (H - total) / 2)
  const pw = side ? Math.max(40, Math.min(W * 0.48, total * 1.5)) : Math.max(40, Math.min(W, total * 1.8))
  const x0 = side ? 0 : (W - pw) / 2
  const cx = x0 + pw / 2
  const widthAtY = (y: number) => pw * Math.min(1, Math.max(0, up ? (y - y0) / total : 1 - (y - y0) / total))
  const colX = pw + 48
  const colW = Math.max(20, W - colX)
  const tipIdx = up ? 0 : N - 1

  const nodes: LayoutNode[] = []
  levels.forEach((lv, i) => {
    const y = y0 + i * (rowH + GAP)
    const wt = widthAtY(y)
    const wb = widthAtY(y + rowH)
    const wMax = Math.max(wt, wb)
    const fill = rampColor(ctx, fillMode, i, N)
    const ink = onColor(ctx, fill)
    nodes.push(pathNode(ctx, trapezoidPath({ x: cx - wMax / 2, y, width: wMax, height: rowH }, (wMax - wt) / 2, (wMax - wb) / 2), `level[${i}]`, { fill }))

    // Where text can sit: the tip level uses its wide end, the rest the row centre.
    const lines = noteMode === 'inside' && lv.text ? 2 : 1
    const wantLabelH = linesHeight(ctx, lv.label, labelS, Math.max(4, wMax - 2 * PAD), lines === 2 ? 2 : 1)
    const textH = Math.min(rowH - 4, wantLabelH + (noteMode === 'inside' && lv.text ? 2 + lineH(noteS) : 0))
    const isTip = i === tipIdx
    const ty = isTip ? (up ? y + rowH - textH - 4 : y + 4) : y + (rowH - textH) / 2
    // Narrowest point of the text block bounds the available width.
    const availW = Math.max(4, Math.min(widthAtY(ty), widthAtY(ty + textH)) - 2 * PAD)
    const labelFits = ctx.measureText(lv.label, labelS).width * TEXT_SLACK <= availW
    const labelInside = noteMode === 'inside' || noteMode === 'none' || labelFits

    if (labelInside) {
      const nl = noteMode === 'inside' ? Math.max(0, Math.floor((rowH - 4 - lineH(labelS) - 2) / lineH(noteS))) : 0
      const lh = linesHeight(ctx, lv.label, labelS, availW, 1)
      const noteH = noteMode === 'inside' && lv.text && nl > 0 ? linesHeight(ctx, lv.text, noteS, availW, nl) : 0
      const block = lh + (noteH ? 2 + noteH : 0)
      const top = isTip ? (up ? y + rowH - block - 4 : y + 4) : y + (rowH - block) / 2
      const w = Math.max(4, Math.min(widthAtY(top), widthAtY(top + block)) - 2 * PAD)
      nodes.push(...placeLines(ctx, lv.label, { ...labelS, color: ink }, { x: cx - w / 2, y: top, width: w }, 'center', 1, `label[${i}]`).nodes)
      if (noteH) nodes.push(...placeLines(ctx, lv.text, { ...noteS, color: ink }, { x: cx - w / 2, y: top + lh + 2, width: w }, 'center', nl, `note[${i}]`).nodes)
    }

    if (side) {
      const rightEdge = cx + widthAtY(y + rowH / 2) / 2
      const showLabel = !labelInside
      const nl = Math.max(showLabel ? 0 : 1, Math.floor((rowH - 4 - (showLabel ? lineH(labelS) + 2 : 0)) / lineH(noteS)))
      const lh = showLabel ? linesHeight(ctx, lv.label, labelS, colW, 1) : 0
      const nh = lv.text && nl > 0 ? linesHeight(ctx, lv.text, noteS, colW, nl) : 0
      if (lh || nh) {
        const block = lh + (lh && nh ? 2 : 0) + nh
        const top = y + Math.max(0, (rowH - block) / 2)
        nodes.push(solidRect({ x: rightEdge + 8, y: y + rowH / 2 - 1, width: Math.max(0, colX - 10 - (rightEdge + 8)), height: 2 }, c.line, `leader[${i}]`))
        if (lh) nodes.push(...placeLines(ctx, lv.label, { ...labelS, color: c.text }, { x: colX, y: top, width: colW }, 'start', 1, `side[${i}]`).nodes)
        if (nh) nodes.push(...placeLines(ctx, lv.text, { ...noteS, color: c.text }, { x: colX, y: top + lh + (lh ? 2 : 0), width: colW }, 'start', nl, `note[${i}]`).nodes)
      }
    }
  })
  return root(ctx, nodes)
}

export function capacity(props: PyramidProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ levels: { max: PYRAMID_MAX, used: asArr(props.levels).length } }, true, [
    { kind: 'truncate', slot: 'levels' },
    { kind: 'paginate' },
  ])
}
