/**
 * Pure layout function for tls.l.field — full-bleed background.
 *
 * Renders a full-size filled rect with the surface colour. No children.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { FieldProps } from './schema'

export function layout(_props: FieldProps, ctx: LayoutContext): LayoutNode {
  const W = ctx.box.width
  const H = ctx.box.height
  const surfaceColor = ctx.resolveColor('surface').color

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: [
      {
        k: 'rect',
        box: { x: 0, y: 0, width: W, height: H },
        part: 'field',
        fill: { type: 'solid', color: surfaceColor },
      },
    ],
  }
}
