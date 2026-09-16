/**
 * Pure layout function for tls.l.section — titled section.
 *
 * Renders a title text line, then a divider line, then lays out children
 * in the remaining space below.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { SectionProps } from './schema'

export function layout(props: SectionProps, ctx: LayoutContext): LayoutNode {
  const title = props.title ?? 'Section'
  const gapToken = (props.gap ?? 'sm') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.sm
  const children = (props as unknown as { children?: BlockSpec[] }).children ?? []

  const W = ctx.box.width
  const H = ctx.box.height

  // Measure title text
  const titleStyle = ctx.resolveText('subheading')
  const titleMetrics = ctx.measureText(title, titleStyle, W)
  const titleH = titleMetrics.height || titleStyle.size * titleStyle.lineHeight

  const dividerY = titleH + gap * 0.5
  const dividerEndY = dividerY + gap * 0.5
  const contentY = dividerEndY + gap
  const contentH = Math.max(0, H - contentY)

  const titleNode: LayoutNode = {
    k: 'text',
    box: { x: 0, y: 0, width: W, height: titleH },
    part: 'title',
    lines: titleMetrics.lines,
    style: titleStyle,
  }

  const dividerNode: LayoutNode = {
    k: 'line',
    box: { x: 0, y: dividerY, width: W, height: gap },
    part: 'divider',
    from: { x: 0, y: 0 },
    to: { x: W, y: 0 },
    stroke: { color: ctx.resolveColor('line').color, width: 1 },
  }

  const contentBox = { x: 0, y: contentY, width: W, height: contentH }
  const childNodes: LayoutNode[] = children.map((child) => {
    return ctx.layoutChild(child, contentBox)
  })

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: [titleNode, dividerNode, ...childNodes],
  }
}
