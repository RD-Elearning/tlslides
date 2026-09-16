/**
 * Pure layout function for tls.l.grid-guide — alignment grid (editorOnly).
 *
 * Renders horizontal and vertical guide lines at equal intervals.
 * In headless mode, returns an empty group (guides are editor-only).
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { GridGuideProps } from './schema'

export function layout(props: GridGuideProps, ctx: LayoutContext): LayoutNode {
  const W = ctx.box.width
  const H = ctx.box.height
  const divisions = Math.max(2, Math.floor(props.divisions ?? 3))

  // In headless (export) mode, don't render guides.
  if (ctx.headless) {
    return {
      k: 'group',
      box: { x: 0, y: 0, width: W, height: H },
      part: 'root',
      children: [],
    }
  }

  const lineColor = ctx.resolveColor('line').color
  const lines: LayoutNode[] = []

  // Vertical guide lines (splitting width into `divisions` equal parts)
  for (let i = 1; i < divisions; i++) {
    const x = (W * i) / divisions
    lines.push({
      k: 'line',
      box: { x: 0, y: 0, width: 0, height: H },
      part: `vguide-${i}`,
      from: { x, y: 0 },
      to: { x, y: H },
      stroke: { color: lineColor, width: 0.5 },
    })
  }

  // Horizontal guide lines (splitting height into `divisions` equal parts)
  for (let i = 1; i < divisions; i++) {
    const y = (H * i) / divisions
    lines.push({
      k: 'line',
      box: { x: 0, y: 0, width: W, height: 0 },
      part: `hguide-${i}`,
      from: { x: 0, y },
      to: { x: W, y },
      stroke: { color: lineColor, width: 0.5 },
    })
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: lines,
  }
}
