/**
 * Pure layout function for tls.l.grid — grid with columns/rows.
 *
 * Arranges children in a grid with the given column/row count and gap.
 * Children beyond cols*rows are clipped.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { GridProps } from './schema'

export function layout(props: GridProps, ctx: LayoutContext): LayoutNode {
  const cols = Math.max(1, Math.floor(props.columns ?? 2))
  const rows = Math.max(1, Math.floor(props.rows ?? 2))
  const gapToken = (props.gap ?? 'md') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.md
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height

  const totalColGap = cols > 1 ? gap * (cols - 1) : 0
  const totalRowGap = rows > 1 ? gap * (rows - 1) : 0
  const cellW = cols > 0 ? Math.max(0, (W - totalColGap) / cols) : 0
  const cellH = rows > 0 ? Math.max(0, (H - totalRowGap) / rows) : 0

  const limit = Math.min(children.length, cols * rows)
  const childNodes: LayoutNode[] = []

  for (let i = 0; i < limit; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const childBox = {
      x: col * (cellW + gap),
      y: row * (cellH + gap),
      width: cellW,
      height: cellH,
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
