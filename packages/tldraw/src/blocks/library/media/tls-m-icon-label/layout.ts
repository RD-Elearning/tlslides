/**
 * Pure layout function for tls.m.icon-label — icon with text label.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import type { IconLabelProps } from './schema'

const iconSizeMap: Record<string, number> = { sm: 16, md: 24, lg: 32 }

export function layout(props: IconLabelProps, ctx: LayoutContext): LayoutNode {
  const typeToken = 'body' as TypeToken
  const color = props.color ?? 'accent'
  const iconSizePx = iconSizeMap[props.size ?? 'md'] ?? 24
  const labelText = props.label ?? ''

  const style = ctx.resolveText(typeToken)
  const iconColor = ctx.resolveColor(color).color

  const m = ctx.measureText(labelText, style, ctx.box.width)

  const iconNode: LayoutNode = {
    k: 'text',
    part: 'icon',
    box: { x: 0, y: 0, width: iconSizePx, height: iconSizePx },
    lines: [{ text: props.icon ?? '', style: { fontFamily: 'icons' }, color: iconColor }],
  }

  const labelNode: LayoutNode = {
    k: 'text',
    part: 'label',
    box: { x: 0, y: iconSizePx + 4, width: ctx.box.width, height: m.height },
    lines: m.lines,
    style: { ...style, color: ctx.resolveColor('textPrimary').color },
    propPath: 'label',
  }

  const totalHeight = iconSizePx + 4 + m.height

  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: totalHeight }, part: 'root', children: [iconNode, labelNode] }
}