/**
 * Pure layout function for tls.t.caption — caption text.
 *
 * Small text typically placed under images, charts, or other media.
 * Uses the 'caption' type token and text-muted color role for
 * secondary content that should not compete with the main content.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import type { CaptionProps } from './schema'

export function layout(props: CaptionProps, ctx: LayoutContext): LayoutNode {
  const typeToken = 'caption' as TypeToken
  const textColor = props.color ?? 'textMuted'

  const style = ctx.resolveText(typeToken)
  const resolvedStyle = {
    ...style,
    color: ctx.resolveColor(textColor).color,
  }

  const inner = { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }
  const text = props.text ?? ''

  const m = ctx.measureText(text, resolvedStyle, inner.width)

  const textNode: LayoutNode = {
    k: 'text',
    part: 'text',
    box: { ...inner, height: Math.min(m.height, inner.height) },
    lines: m.lines,
    style: resolvedStyle,
  }

  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }, part: 'root', children: [textNode] }
}
