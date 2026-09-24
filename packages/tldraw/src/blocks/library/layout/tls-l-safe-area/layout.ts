/**
 * Pure layout function for tls.l.safe-area — content safe area (editorOnly).
 *
 * Insets the content box by the given token, then lays out children
 * inside the safe area. Intended as an editor-only visual guide;
 * in headless mode the children are laid out without the inset.
 */

import type { LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { SafeAreaProps } from './schema'
import { insetBox } from '../../../layout/box-model'

export function layout(props: SafeAreaProps, ctx: LayoutContext): LayoutNode {
  const insetToken = (props.inset ?? 'md') as SpaceToken
  const inset = ctx.tokens.space[insetToken] ?? ctx.tokens.space.md
  const children = props.children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const outerBox = { x: 0, y: 0, width: W, height: H }

  // In editor mode, inset by the token. In headless (export), lay out at full size.
  const contentBox = ctx.headless ? outerBox : insetBox(outerBox, inset)

  let childNodes: LayoutNode[]
  if (children.length > 1) {
    // Delegate multi-child stacking to tls.l.stack so each child gets a non-overlapping box.
    childNodes = [ctx.layoutChild({ id: '$stack', type: 'tls.l.stack', props: { gap: 'sm', children, sizing: 'content' } }, contentBox)]
  } else {
    childNodes = children.map((child) => ctx.layoutChild(child, contentBox))
  }

  return {
    k: 'group',
    box: outerBox,
    part: 'root',
    children: childNodes,
  }
}
