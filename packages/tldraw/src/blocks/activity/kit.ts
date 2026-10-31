/**
 * L03 — the static poster shared by the activity blocks: a question, then rounded cells (rows or a
 * grid) with their text, an optional strip of chips, and a footer band the live block fills.
 * Parts: `question`, `cell[i]` (the rounded rect), `celltext[i]`, `chip[i]` / `chiptext[i]`,
 * `footer` (an empty 1-unit rect at the bottom edge so exports bound the poster by it).
 * The live template puts real `<button>`s over these boxes, so poster, PDF and live agree.
 */

import type { LayoutContext, LayoutNode } from '../types'
import { composeFlat, measureHeights, toMeasurable, type Piece } from '../library/composite/_kit'

export interface CellsPoster {
  prompt: unknown
  /** One cell per entry. */
  cells: string[]
  /** 1 = rows, 2/3 = a grid. */
  cols?: 1 | 2 | 3
  /** Minimum cell height (cards / answer areas). */
  cellMin?: number
  /** Short chips under the cells (the word bank of a fill-in). */
  chips?: string[]
  /** A cell reserved for a long free area under the cells (reveal's answer area), in slide units. */
  area?: number
  /** Footer band height (feedback and controls). */
  footer: number
}

export interface CellsPlan {
  node: LayoutNode
  height: number
}

export function cellsPoster(ctx: LayoutContext, o: CellsPoster): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const gap = ctx.tokens.space.md
  const padX = ctx.tokens.space.lg
  const padY = ctx.tokens.space.sm
  const cols = o.cols ?? 1
  const cellW = Math.max(1, (W - gap * (cols - 1)) / cols)
  const qH = measureHeights(ctx, [{ id: 'q', type: 'tls.t.title', props: { text: toMeasurable(o.prompt), size: 'subheading' } }], W)[0]
  const textH = measureHeights(ctx, o.cells.map((t, i) => ({ id: `c${i}`, type: 'tls.t.body', props: { text: t } })), Math.max(1, cellW - 2 * padX))
  const heights = o.cells.map((_, i) => Math.max(o.cellMin ?? 0, textH[i] + 2 * padY + 4, 64))
  // equal height within a grid row
  for (let r = 0; r * cols < o.cells.length; r++) {
    const row = heights.slice(r * cols, r * cols + cols)
    const m = Math.max(...row)
    for (let i = r * cols; i < Math.min(o.cells.length, r * cols + cols); i++) heights[i] = m
  }
  const surfaceAlt = ctx.resolveColor('surfaceAlt').color
  const radius = ctx.tokens.radius.lg
  const pieces: Piece[] = [{ id: 'question', spec: { id: 'question', type: 'tls.t.title', props: { text: toMeasurable(o.prompt), size: 'subheading' } }, box: { x: 0, y: 0, width: W, height: qH } }]
  let y = qH + gap * 1.5
  let rowTop = y
  o.cells.forEach((text, i) => {
    const col = i % cols
    if (col === 0 && i > 0) rowTop += heights[i - 1] + gap
    const box = { x: col * (cellW + gap), y: rowTop, width: cellW, height: heights[i] }
    pieces.push({ id: `cell[${i}]`, raw: [{ k: 'rect', box, fill: { type: 'solid', color: surfaceAlt }, radius } as LayoutNode], box })
    pieces.push({ id: `celltext[${i}]`, spec: { id: `celltext-${i}`, type: 'tls.t.body', props: { text } }, box: { x: box.x + padX, y: box.y + (box.height - textH[i]) / 2, width: Math.max(1, cellW - 2 * padX), height: textH[i] } })
  })
  y = o.cells.length ? rowTop + heights[heights.length - 1] : y
  if (o.area) {
    const box = { x: 0, y: y + (o.cells.length ? gap : 0), width: W, height: o.area }
    pieces.push({ id: 'area', raw: [{ k: 'rect', box, fill: { type: 'solid', color: surfaceAlt }, radius } as LayoutNode], box })
    y = box.y + o.area
  }
  if (o.chips?.length) {
    const chipFont = ctx.resolveText('body')
    const chipH = Math.ceil(chipFont.size * chipFont.lineHeight) + padY * 2 + 8
    let x = 0
    let cy = y + gap
    const widths = o.chips.map((t) => Math.min(W, Math.ceil(t.length * chipFont.size * 0.6) + padX * 2))
    o.chips.forEach((t, i) => {
      if (x > 0 && x + widths[i] > W) {
        x = 0
        cy += chipH + gap / 2
      }
      const box = { x, y: cy, width: widths[i], height: chipH }
      pieces.push({ id: `chip[${i}]`, raw: [{ k: 'rect', box, fill: { type: 'solid', color: surfaceAlt }, radius: chipH / 2 } as LayoutNode], box })
      pieces.push({ id: `chiptext[${i}]`, spec: { id: `chiptext-${i}`, type: 'tls.t.body', props: { text: t } }, box: { x: x + padX, y: cy + padY + 2, width: Math.max(1, widths[i] - 2 * padX), height: Math.ceil(chipFont.size * chipFont.lineHeight) } })
      x += widths[i] + gap / 2
    })
    y = cy + chipH
  }
  const height = Math.ceil(y + gap * 1.5 + o.footer)
  const root = composeFlat(ctx, pieces, height)
  if (root.k !== 'group') return root
  const band: LayoutNode = { k: 'rect', part: 'footer', box: { x: 0, y: height - 1, width: W, height: 1 } }
  return { ...root, children: [...root.children, band] }
}

/** The bottom of the last cell/chip/area: where the footer band starts. */
export function contentBottom(poster: LayoutNode, ctxGap: number): number {
  if (poster.k !== 'group') return poster.box.height
  let b = 0
  for (const n of poster.children) if (n.part !== 'footer') b = Math.max(b, n.box.y + n.box.height)
  return b + ctxGap * 1.5
}
