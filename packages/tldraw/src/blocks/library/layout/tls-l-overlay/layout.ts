/**
 * Pure layout function for tls.l.overlay — layered children (z-stacked).
 *
 * Every child fills the full box, layered in document order (last child on top).
 */

import type { BlockSpec, LayoutContext, LayoutNode, Paint } from '../../../types'
import type { OverlayProps } from './schema'

export function layout(_props: OverlayProps, ctx: LayoutContext): LayoutNode {
  const children = (_props as unknown as { children?: BlockSpec[] }).children ?? []
  const W = ctx.box.width
  const H = ctx.box.height
  const fullBox = { x: 0, y: 0, width: W, height: H }

  // The overlay's own background: the instance's Paint when set, else the resolved
  // surface role. Rendered first so it sits behind every layered child.
  const surfacePaint: Paint =
    ctx.style?.surface && typeof ctx.style.surface !== 'string'
      ? ctx.style.surface
      : { type: 'solid', color: ctx.resolveColor('surface').color }

  const childNodes: LayoutNode[] = children.map((child) => {
    return ctx.layoutChild(child, fullBox)
  })

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    clip: true,
    children: [
      {
        k: 'rect',
        part: 'surface',
        box: fullBox,
        fill: surfacePaint,
      },
      ...childNodes,
    ],
  }
}
