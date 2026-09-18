/**
 * Pure layout function for tls.l.repeater — repeats template for each item.
 *
 * If a template child is provided, it is laid out `count` times in the
 * specified direction. Otherwise, placeholder rects are emitted.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { RepeaterProps } from './schema'

export function layout(props: RepeaterProps, ctx: LayoutContext): LayoutNode {
  const count = Math.max(1, Math.floor(props.count ?? 3))
  const direction = (props.direction ?? 'y') as 'x' | 'y'
  const gapToken = (props.gap ?? 'sm') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.sm
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []
  const template = children.length > 0 ? children[0] : null

  const W = ctx.box.width
  const H = ctx.box.height

  const totalGap = count > 1 ? gap * (count - 1) : 0

  const childNodes: LayoutNode[] = []

  if (direction === 'y') {
    const itemH = count > 0 ? Math.max(0, (H - totalGap) / count) : 0
    for (let i = 0; i < count; i++) {
      const itemBox = { x: 0, y: i * (itemH + gap), width: W, height: itemH }
      if (template) {
        childNodes.push(ctx.layoutChild(template, itemBox))
      } else {
        childNodes.push({
          k: 'rect',
          box: itemBox,
          part: `placeholder-${i}`,
          fill: { type: 'solid', color: ctx.resolveColor('surfaceAlt').color },
        })
      }
    }
  } else {
    const itemW = count > 0 ? Math.max(0, (W - totalGap) / count) : 0
    for (let i = 0; i < count; i++) {
      const itemBox = { x: i * (itemW + gap), y: 0, width: itemW, height: H }
      if (template) {
        childNodes.push(ctx.layoutChild(template, itemBox))
      } else {
        childNodes.push({
          k: 'rect',
          box: itemBox,
          part: `placeholder-${i}`,
          fill: { type: 'solid', color: ctx.resolveColor('surfaceAlt').color },
        })
      }
    }
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: childNodes,
  }
}
