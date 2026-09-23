/**
 * Pure layout function for tls.m.icon-label — icon with text label.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import { getIcon } from '../../../icons'
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

  const iconDef = getIcon(props.icon)
  // Fallback to a warning triangle for unknown names, matching tls.m.icon's convention.
  const iconPath =
    iconDef?.path ??
    'M10.29 3.87L5.62 18a2 2 0 001.71 3h13.16a2 2 0 001.71-3L13.71 3.87a2 2 0 00-3.42 0zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3.29l-3.3 3.3a1 1 0 101.42 1.42L11 9.41V7a1 1 0 00-1-1z'
  const iconNode: LayoutNode = {
    k: 'icon',
    part: 'icon',
    box: { x: 0, y: 0, width: iconSizePx, height: iconSizePx },
    icon: iconPath,
    fill: iconColor,
    strokeWidth: 1.5,
  }

  const labelNode: LayoutNode = {
    k: 'text',
    part: 'label',
    box: { x: 0, y: iconSizePx + 4, width: ctx.box.width, height: m.height },
    lines: m.lines,
    style: { ...style, color: ctx.resolveColor('text').color },
    propPath: 'label',
  }

  const totalHeight = iconSizePx + 4 + m.height

  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: totalHeight }, part: 'root', children: [iconNode, labelNode] }
}