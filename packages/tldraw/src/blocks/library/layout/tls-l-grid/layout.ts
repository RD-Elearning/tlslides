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

export function layout(props: GridProps, ctx: LayoutContext): LayoutNode {
  const cols = Math.max(1, Math.floor(props.columns ?? 2))
  const rows = Math.max(1, Math.floor(props.rows ?? 2))
  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
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
    childNodes.push(ctx.layoutChild(children[i], childBox))
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: childNodes,
  }
}