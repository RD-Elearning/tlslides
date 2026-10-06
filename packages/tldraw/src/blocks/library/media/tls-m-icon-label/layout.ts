/**
 * Pure layout function for tls.m.icon-label — icon with text label.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import { iconLeaf } from '../../text/_engine/icon'
import type { IconLabelProps } from './schema'

/** Icon side per `size` step; the icon is a feature mark, not a bullet glyph. */
export const ICON_STEP: Record<string, number> = { sm: 28, md: 44, lg: 72 }
const GAP = 8

export function layout(props: IconLabelProps, ctx: LayoutContext): LayoutNode {
  const typeToken = 'body' as TypeToken
  const color = props.color ?? 'accent'
  const labelText = props.label ?? ''

  const style = ctx.resolveText(typeToken)
  const iconColor = ctx.resolveColor(color).color

  const m = ctx.measureText(labelText, style, ctx.box.width)
  // The icon shrinks (floor 14) to leave room for the label when the box is short or narrow.
  const want = ICON_STEP[props.size ?? 'md'] ?? ICON_STEP.md
  const byHeight = ctx.box.height > 0 ? ctx.box.height - GAP - m.height : want
  const byWidth = ctx.box.width > 0 ? ctx.box.width : want
  const iconSizePx = Math.max(14, Math.min(want, byHeight, byWidth))

  const iconNode = iconLeaf(props.icon, { x: 0, y: 0, width: iconSizePx, height: iconSizePx }, iconColor, 'icon')

  const labelNode: LayoutNode = {
    k: 'text',
    part: 'label',
    box: { x: 0, y: iconSizePx + GAP, width: ctx.box.width, height: m.height },
    lines: m.lines,
    style: { ...style, color: ctx.resolveColor('text').color },
    propPath: 'label',
  }

  const totalHeight = iconSizePx + GAP + m.height

  return { k: 'group', box: { x: 0, y: 0, width: ctx.box.width, height: totalHeight }, part: 'root', children: [iconNode, labelNode] }
}