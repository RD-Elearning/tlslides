/**
 * Pure layout function for tls.l.grid — grid with columns/rows.
 *
 * Arranges children in a grid with the given column/row count and gap.
 * Children beyond cols*rows are clipped.
 *
 * V4.1: Supports `sizing: 'content'` for intrinsic-size-based distribution
 * when children implement `intrinsicSize`.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { GridProps } from './schema'
import { tagChildren } from '../_motion'
import { styleGap } from '../_style'
import { isAuthoredContext } from '../../../layout/layout-child'
import { peerTracks } from '../../../layout/peer-tracks'
import { peerShapeSteps } from '../../media/tls-m-shape/layout'

/**
 * S11 (sprint 2026-11b): cells of a grid whose children span 1 or 2 columns, row-major; a wide cell that
 * does not fit the rest of a row starts the next one. `null` when every span is 1 (the classic grid).
 */
export function spanCells(spans: readonly unknown[] | undefined, n: number, cols: number): Array<{ col: number; row: number; span: number }> | null {
  const list = Array.from({ length: n }, (_, i) => {
    const v = Math.floor(Number(spans?.[i] ?? 1))
    return Math.max(1, Math.min(cols, v === 2 ? 2 : 1))
  })
  if (!list.some((s) => s > 1)) return null
  const out: Array<{ col: number; row: number; span: number }> = []
  let col = 0
  let row = 0
  for (const span of list) {
    if (col + span > cols) {
      col = 0
      row++
    }
    out.push({ col, row, span })
    col += span
    if (col >= cols) {
      col = 0
      row++
    }
  }
  return out
}

export function layout(props: GridProps, ctx: LayoutContext): LayoutNode {
  const cols = Math.max(1, Math.floor(props.columns ?? 2))
  const allKids = (props as unknown as { children?: BlockSpec[] }).children ?? []
  const cells = spanCells(props.spans, allKids.length, cols)
  if (cells) return spannedLayout(props, ctx, cols, cells, allKids)
  const rows = Math.max(1, Math.floor(props.rows ?? 2))
  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = styleGap(ctx, ctx.tokens.space[gapToken] ?? ctx.tokens.space.md) // CMP1: style.gap wins
  const sizingMode = props.sizing ?? 'equal'
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height

  // Calculate available space after gaps
  const totalColGap = cols > 1 ? gap * (cols - 1) : 0
  const totalRowGap = rows > 1 ? gap * (rows - 1) : 0
  const availableWidth = W - totalColGap
  const availableHeight = H - totalRowGap

  // Measure intrinsic sizes for content-based distribution
  let intrinsicSizes: { width: number; height: number }[] | undefined
  if (sizingMode === 'content' && ctx.measureIntrinsicSize && children.length > 0) {
    const measure = ctx.measureIntrinsicSize
    intrinsicSizes = children.slice(0, cols * rows).map((child) => {
      return measure(child)
    })
  }

  // Calculate column widths
  const colWidths: number[] = []
  if (sizingMode === 'content' && intrinsicSizes && intrinsicSizes.length > 0) {
    // Calculate total width per column
    const colTotalWidths = new Array(cols).fill(0)
    const colCounts = new Array(cols).fill(0)
    for (let i = 0; i < intrinsicSizes.length; i++) {
      const col = i % cols
      colTotalWidths[col] += intrinsicSizes[i].width
      colCounts[col]++
    }
    const totalWidth = colTotalWidths.reduce((sum, w, i) => sum + w, 0)
    if (totalWidth > 0) {
      const scale = availableWidth / totalWidth
      for (let c = 0; c < cols; c++) {
        colWidths[c] = Math.max(1, colTotalWidths[c] * scale)
      }
    } else {
      for (let c = 0; c < cols; c++) {
        colWidths[c] = availableWidth / cols
      }
    }
  } else {
    for (let c = 0; c < cols; c++) {
      colWidths[c] = availableWidth / cols
    }
  }

  // Calculate row heights
  const rowHeights: number[] = []
  if (sizingMode === 'content' && intrinsicSizes && intrinsicSizes.length > 0) {
    // Calculate total height per row
    const rowTotalHeights = new Array(rows).fill(0)
    for (let i = 0; i < intrinsicSizes.length; i++) {
      const row = Math.floor(i / cols)
      rowTotalHeights[row] += intrinsicSizes[i].height
    }
    const totalHeight = rowTotalHeights.reduce((sum, h) => sum + h, 0)
    if (totalHeight > 0) {
      const scale = availableHeight / totalHeight
      for (let r = 0; r < rows; r++) {
        rowHeights[r] = Math.max(1, rowTotalHeights[r] * scale)
      }
    } else {
      for (let r = 0; r < rows; r++) {
        rowHeights[r] = availableHeight / rows
      }
    }
  } else {
    for (let r = 0; r < rows; r++) {
      rowHeights[r] = availableHeight / rows
    }
  }

  // Position children in grid cells
  const limit = Math.min(children.length, cols * rows)
  const childNodes: LayoutNode[] = []

  // CMP4: authored peer cards of one structure in a grid row share their children's tracks
  const rowTracks: Array<number[] | undefined> = []
  if (isAuthoredContext(ctx)) {
    for (let r = 0; r * cols < limit; r++) {
      const peers = children.slice(r * cols, Math.min(limit, (r + 1) * cols))
      rowTracks[r] = peerTracks(peers, peers.map((_, c) => colWidths[c] ?? 0), ctx, rowHeights[r] ?? 0)
    }
  }

  // CS1: peer shapes of one kind and size share one label step
  const shapeSteps = isAuthoredContext(ctx)
    ? peerShapeSteps(children.slice(0, limit), children.slice(0, limit).map((_, i) => ({ width: colWidths[i % cols] ?? 0, height: rowHeights[Math.floor(i / cols)] ?? 0 })), ctx)
    : undefined

  for (let i = 0; i < limit; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    // Calculate position: cumulative sum of previous column/row widths plus gaps
    let xPos = 0
    for (let c = 0; c < col; c++) {
      xPos += colWidths[c] + gap
    }
    let yPos = 0
    for (let r = 0; r < row; r++) {
      yPos += rowHeights[r] + gap
    }

    const childBox = {
      x: xPos,
      y: yPos,
      width: colWidths[col] ?? 0,
      height: rowHeights[row] ?? 0,
    }
    const tracks = rowTracks[row]
    const peerStep = shapeSteps?.[i]
    childNodes.push(ctx.layoutChild(children[i], childBox, tracks || peerStep !== undefined ? { ...(tracks ? { tracks } : {}), ...(peerStep !== undefined ? { peerStep } : {}) } : undefined))
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: tagChildren(childNodes), // RVM2: child/<i> motion parts
  }
}

/** S11: a grid with wide cells — equal columns and rows, a span-2 cell takes two columns and the gap between. */
function spannedLayout(props: GridProps, ctx: LayoutContext, cols: number, cells: Array<{ col: number; row: number; span: number }>, children: BlockSpec[]): LayoutNode {
  const gap = styleGap(ctx, ctx.tokens.space[(props.gap ?? 'md') as SpaceToken] ?? ctx.tokens.space.md)
  const W = ctx.box.width
  const H = ctx.box.height
  const rows = Math.max(1, ...cells.map((c) => c.row + 1))
  const cw = (W - gap * (cols - 1)) / cols
  const rh = (H - gap * (rows - 1)) / rows
  const boxes = cells.map((c) => ({ x: c.col * (cw + gap), y: c.row * (rh + gap), width: cw * c.span + gap * (c.span - 1), height: rh }))
  // the cells of a row share their children's tracks (a wide cell too: its heading and body start on the
  // lines of its neighbours'), row by row as the classic grid
  const tracksOf: Array<number[] | undefined> = new Array(children.length)
  if (isAuthoredContext(ctx)) {
    for (let r = 0; r < rows; r++) {
      const idx = cells.map((c, i) => (c.row === r ? i : -1)).filter((i) => i >= 0)
      if (idx.length > 1) {
        const t = peerTracks(idx.map((i) => children[i]), idx.map((i) => boxes[i].width), ctx, rh)
        idx.forEach((i) => (tracksOf[i] = t))
      }
    }
  }
  const childNodes = children.map((child, i) => ctx.layoutChild(child, boxes[i], tracksOf[i] ? { tracks: tracksOf[i] } : undefined))
  return { k: 'group', box: { x: 0, y: 0, width: W, height: H }, part: 'root', children: tagChildren(childNodes) }
}
