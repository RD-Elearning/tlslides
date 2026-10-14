/**
 * tls.m.icon layout function — renders an SVG icon.
 *
 * Uses the icon lookup from '@/blocks/icons' to resolve the icon name
 * to an SVG path, then renders it as an icon LayoutNode with proper color.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import { iconLeaf } from '../../text/_engine/icon'
import { atomPaint } from '../../text/_engine/atom'
import { readableOn, tintOf } from '../../text/_engine/color'
import { blobPath } from '../tls-m-decoration/layout'
import type { IconProps } from './schema'

/** Default icon size in slide units (24×24 viewBox): an inline glyph. */
const ICON_SIZE = 24
/** `props.size` steps, for an icon that stands alone on a slide. */
export const ICON_PX = { sm: ICON_SIZE, md: 48, lg: 80, xl: 128 } as const

/** CMP3: a disc is this many times the icon's side across. */
export const DISC_RATIO = 1.75

/** Side of the icon: the `size` step, never larger than the box it was given (when the box is
 *  known; with a disc, the disc must fit). */
/** enhance I-3: the styles drawn on a backing (disc, tile, sticker, blob) take DISC_RATIO × the icon. */
const BACKED = new Set(['disc', 'tile', 'sticker', 'blob'])

export function iconSide(props: IconProps, box: { width: number; height: number }): number {
  const step = ICON_PX[props.size as keyof typeof ICON_PX] ?? ICON_SIZE
  const room = Math.min(box.width > 0 ? box.width : Infinity, box.height > 0 ? box.height : Infinity)
  const k = BACKED.has(props.iconStyle ?? '') ? DISC_RATIO : 1
  return Math.max(1, Math.min(step, room / k))
}

export function layout(props: IconProps, ctx: LayoutContext): LayoutNode {
  const side = iconSide(props, ctx.box)
  const color = ctx.resolveColor(props.color ?? 'accent')
  if (props.iconStyle === 'tile' || props.iconStyle === 'sticker' || props.iconStyle === 'blob') return treated(props, ctx, side, color.color)
  if (props.iconStyle === 'disc') {
    // CMP3: the icon centred on a disc — tinted from the icon's colour (glass: frosted), or a solid
    // accent disc when the icon is `onAccent`. The icon ink is solved for 3:1 on the disc (an icon
    // is a large graphic).
    const d = Math.round(side * DISC_RATIO)
    const solid = props.color === 'onAccent'
    const paint = atomPaint(ctx, solid ? 'solid' : 'soft', solid ? ctx.resolveColor('accent').color : color.color)
    const under = paint.fill && paint.fill.type === 'solid' && /^#/.test(paint.fill.color) ? paint.fill.color : paint.under
    const ink = solid ? paint.ink : readableOn(color.color, under, 3)
    const disc: LayoutNode = {
      k: 'rect',
      part: 'icon.disc',
      box: { x: 0, y: 0, width: d, height: d },
      ...(paint.fill ? { fill: paint.fill } : {}),
      ...(paint.stroke ? { stroke: paint.stroke } : {}),
      ...(paint.shadow ? { shadow: paint.shadow } : {}),
      radius: d / 2,
    } as LayoutNode
    const off = (d - side) / 2
    return { k: 'group', part: 'root', box: { x: 0, y: 0, width: d, height: d }, children: [disc, iconLeaf(props.icon, { x: off, y: off, width: side, height: side }, ink, 'icon')] }
  }
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
  const d = BACKED.has(props.iconStyle ?? '') ? Math.round(s * DISC_RATIO) : s
  return { width: d, height: d }
}
/** A stable small number from the icon's name: the blob's shape follows the icon, not the slide. */
function seedOf(name: string): number {
  let h = 7
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return h
}

/**
 * enhance I-3 — the icon on a backing the style asks for: `tile` (a tinted rounded square),
 * `sticker` (a white disc, an ink ring and a hard shadow) or `blob` (a hand-drawn tinted blob, as
 * the doodle styles draw their shapes).
 */
function treated(props: IconProps, ctx: LayoutContext, side: number, iconColor: string): LayoutNode {
  const d = Math.round(side * DISC_RATIO)
  const box = { x: 0, y: 0, width: d, height: d }
  const surface = ctx.resolveColor('surface').color
  const tint = tintOf(surface, iconColor, 0.2)
  const off = (d - side) / 2
  let back: LayoutNode[]
  let ink = readableOn(iconColor, tint, 3)
  if (props.iconStyle === 'tile') {
    back = [{ k: 'rect', part: 'icon.disc', box, fill: { type: 'solid', color: tint }, radius: Math.round(d * 0.28) }]
  } else if (props.iconStyle === 'sticker') {
    const line = ctx.resolveColor('text').color
    back = [{ k: 'rect', part: 'icon.disc', box: { ...box, width: d - 3, height: d - 3 }, fill: { type: 'solid', color: '#ffffff' }, stroke: { color: line, width: 2.5 }, radius: (d - 3) / 2, shadow: 'hard' } as LayoutNode]
    ink = readableOn(iconColor, '#ffffff', 3)
  } else {
    back = [{ k: 'path', part: 'icon.disc', box, d: blobPath(d / 2, d / 2, d / 2, seedOf(String(props.icon)), 0), fill: { type: 'solid', color: tint } }]
  }
  return { k: 'group', part: 'root', box, children: [...back, iconLeaf(props.icon, { x: off, y: off, width: side, height: side }, ink, 'icon')] }
}
