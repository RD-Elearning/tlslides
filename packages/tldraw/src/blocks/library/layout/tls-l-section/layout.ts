/**
 * Pure layout function for tls.l.section — titled section.
 *
 * Renders a title text line, then a divider line, then lays out children
 * in the remaining space below.
 */

import type { LayoutContext, LayoutNode, Paint, SpaceToken } from '../../../types'
import type { SectionProps } from './schema'
import { isShown } from '../../../schema-helpers'

export function layout(props: SectionProps, ctx: LayoutContext): LayoutNode {
  const title = props.title ?? 'Section'
  const showTitle = isShown(props, 'showTitle')
  const showDivider = isShown(props, 'showDivider')
  const gapToken = (props.gap ?? 'sm') as SpaceToken
  const gap = ctx.tokens.space[gapToken] ?? ctx.tokens.space.sm
  const children = props.children ?? []

  const W = ctx.box.width
  const H = ctx.box.height

  // The section's own background: the instance's Paint when set, else the resolved
  // surface role (so it tracks the theme and the gradient behind it).
  const surfacePaint: Paint =
    ctx.style?.surface && typeof ctx.style.surface !== 'string'
      ? ctx.style.surface
      : { type: 'solid', color: ctx.resolveColor('surface').color }

  // Measure title text
  const titleStyle = ctx.resolveText('subheading')
  const titleMetrics = ctx.measureText(title, titleStyle, W)
  const titleH = showTitle ? (titleMetrics.height || titleStyle.size * titleStyle.lineHeight) : 0

  // Compute offsets based on what's visible (reflow when elements are hidden).
  const dividerY = showTitle ? titleH + gap * 0.5 : 0
  const dividerEndY = showDivider ? dividerY + gap * 0.5 : dividerY
  const contentY = dividerEndY + gap
  const contentH = Math.max(0, H - contentY)

  // Build the body children: surface rect, optional title, optional divider.
  const bodyChildren: LayoutNode[] = [
    { k: 'rect', part: 'surface', box: { x: 0, y: 0, width: W, height: H }, fill: surfacePaint },
  ]

  // A hairline rule drawn as a thin rect, matching `tls.t.title`'s own `rule` part — a `line`
  // node's SVG geometry is only its endpoints, so a horizontal line's box height (the gap band)
  // and its rendered height disagree; a rect keeps DOM/SVG geometry parity by construction.
  if (showTitle) {
    bodyChildren.push({
      k: 'text',
      box: { x: 0, y: 0, width: W, height: titleH },
      part: 'title',
      lines: titleMetrics.lines,
      style: titleStyle,
    })
  }

  if (showDivider) {
    bodyChildren.push({
      k: 'rect',
      box: { x: 0, y: dividerY, width: W, height: 1 },
      part: 'divider',
      fill: { type: 'solid', color: ctx.resolveColor('line').color },
    })
  }

  const contentBox = { x: 0, y: contentY, width: W, height: contentH }
  let childNodes: LayoutNode[]
  if (children.length > 1) {
    // Delegate multi-child stacking to tls.l.stack so each child gets a non-overlapping box.
    childNodes = [ctx.layoutChild({ id: '$stack', type: 'tls.l.stack', props: { gap, children, sizing: 'content' } }, contentBox)]
  } else {
    childNodes = children.map((child) => ctx.layoutChild(child, contentBox))
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: [...bodyChildren, ...childNodes],
  }
}
