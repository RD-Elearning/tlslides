/**
 * tls.m.icon layout function — renders an SVG icon.
 *
 * Uses the icon lookup from '@/blocks/icons' to resolve the icon name
 * to an SVG path, then renders it as an icon LayoutNode with proper color.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import { iconLeaf } from '../../text/_engine/icon'
import type { IconProps } from './schema'

/** Default icon size in slide units (24×24 viewBox): an inline glyph. */
const ICON_SIZE = 24
/** `props.size` steps, for an icon that stands alone on a slide. */
export const ICON_PX = { sm: ICON_SIZE, md: 48, lg: 80, xl: 128 } as const

/** Side of the icon: the `size` step, never larger than the box it was given (when the box is known). */
export function iconSide(props: IconProps, box: { width: number; height: number }): number {
  const step = ICON_PX[props.size as keyof typeof ICON_PX] ?? ICON_SIZE
  const room = Math.min(box.width > 0 ? box.width : Infinity, box.height > 0 ? box.height : Infinity)
  return Math.max(1, Math.min(step, room))
}

export function layout(props: IconProps, ctx: LayoutContext): LayoutNode {
  const side = iconSide(props, ctx.box)
  const color = ctx.resolveColor(props.color ?? 'accent')
  // Unknown names degrade to the warning icon (lint reports them); the path is scaled to the box,
  // because the renderers draw the `icon` node's path in a viewBox equal to its own box.
  return iconLeaf(props.icon, { x: 0, y: 0, width: side, height: side }, color.color, 'icon')
}

/**
 * Intrinsic size of an icon is always 24×24 viewBox.
 * Containers can use this for proper distribution.
 */
export function intrinsicSize(props: IconProps, _ctx: LayoutContext) {
  const s = iconSide(props, { width: 0, height: 0 })
  return { width: s, height: s }
}