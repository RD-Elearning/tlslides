/**
 * tls.m.icon layout function — renders an SVG icon.
 *
 * Uses the icon lookup from '@/blocks/icons' to resolve the icon name
 * to an SVG path, then renders it as an icon LayoutNode with proper color.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import { getIcon } from '../../../icons'
import type { IconProps } from './schema'

/** Standard icon size in slide units (24×24 viewBox). */
const ICON_SIZE = 24

export function layout(props: IconProps, ctx: LayoutContext): LayoutNode {
  const iconName = props.icon
  const colorRole = props.color ?? 'accent'
  
  // Resolve color from role
  const color = ctx.resolveColor(colorRole)
  
  // Get the icon definition
  const iconDef = getIcon(iconName)
  
  if (!iconDef) {
    // Fallback to warning icon for unknown names (lint should catch this at build time)
    // The TypeScript type system ensures this path is unreachable from library blocks
    return {
      k: 'icon',
      box: { x: 0, y: 0, width: ICON_SIZE, height: ICON_SIZE },
      part: 'icon',
      icon: 'M10.29 3.87L5.62 18a2 2 0 001.71 3h13.16a2 2 0 001.71-3L13.71 3.87a2 2 0 00-3.42 0zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3.29l-3.3 3.3a1 1 0 101.42 1.42L11 9.41V7a1 1 0 00-1-1z',
      fill: color.color,
      strokeWidth: 1.5,
    }
  }
  
  return {
    k: 'icon',
    box: { x: 0, y: 0, width: ICON_SIZE, height: ICON_SIZE },
    part: 'icon',
    icon: iconDef.path,
    fill: color.color,
    strokeWidth: 1.5,
  }
}

/**
 * Intrinsic size of an icon is always 24×24 viewBox.
 * Containers can use this for proper distribution.
 */
export function intrinsicSize(_props: IconProps, _ctx: LayoutContext) {
  return { width: ICON_SIZE, height: ICON_SIZE }
}