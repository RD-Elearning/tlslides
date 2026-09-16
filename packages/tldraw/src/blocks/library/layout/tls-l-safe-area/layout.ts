/**
 * Pure layout function for tls.l.safe-area — content safe area (editorOnly).
 *
 * Insets the content box by the given token, then lays out children
 * inside the safe area. Intended as an editor-only visual guide;
 * in headless mode the children are laid out without the inset.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { SafeAreaProps } from './schema'
import { insetBox } from '../../../layout/box-model'

export function layout(props: SafeAreaProps, ctx: LayoutContext): LayoutNode {
  const insetToken = (props.inset ?? 'md') as SpaceToken
  const inset = ctx.tokens.space[insetToken] ?? ctx.tokens.space.md
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height
  const outerBox = { x: 0, y: 0, width: W, height: H }

  // In editor mode, inset by the token. In headless (export), lay out at full size.
  const contentBox = ctx.headless ? outerBox : insetBox(outerBox, inset)

  const childNodes: LayoutNode[] = children.map((child) => {
    return ctx.layoutChild(child, contentBox)
  })

  return {
    k: 'group',
    box: outerBox,
    part: 'root',
    children: childNodes,
  }
}
