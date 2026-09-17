/**
 * Pure layout function for tls.t.subtitle — subtitle / secondary heading.
 *
 * Renders a secondary heading text, smaller than the title. Supports alignment
 * and optional color override.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { SubtitleProps } from './schema'

export function layout(props: SubtitleProps, ctx: LayoutContext): LayoutNode {
  const textColor = props.color ?? 'textMuted'

  // subtitle uses 'subheading' step: size 44, lineHeight 1.2
  const style = ctx.resolveText('subheading')

  const resolvedStyle = {
    ...style,
    color: ctx.resolveColor(textColor).color,
  }

  const inner = { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }

  // Measure text within the available width
  const m = ctx.measureText(props.text, resolvedStyle, inner.width)

  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'root',
    children: [{
      k: 'text',
      part: 'text',
      box: { ...inner, height: m.height },
      lines: m.lines,
      style: resolvedStyle,
    }],
  }
}
