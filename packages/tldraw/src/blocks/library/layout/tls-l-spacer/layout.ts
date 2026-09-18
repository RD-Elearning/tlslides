/**
 * Pure layout function for tls.l.spacer — empty space.
 *
 * Returns an empty group that occupies the full box. Pure structural filler;
 * no visual output, no children.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { SpacerProps } from './schema'

export function layout(_props: SpacerProps, ctx: LayoutContext): LayoutNode {
  const W = ctx.box.width
  const H = ctx.box.height

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: [],
  }
}
