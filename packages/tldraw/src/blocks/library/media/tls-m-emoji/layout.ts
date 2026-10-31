/**
 * tls.m.emoji layout — the emoji's SVG as an `image` node (a `data:` URL, so both renderers and
 * the export draw it with no asset), centred in a square of the size step, on an optional backing.
 */

import type { LayoutContext, LayoutNode, LintFinding } from '../../../types'
import { emojiForIcon, emojiUrl } from '../../../icons'
import { iconLeaf } from '../../text/_engine/icon'
import { tintOf } from '../../text/_engine/color'
import type { EmojiProps } from './schema'

export const EMOJI_PX = { sm: 48, md: 96, lg: 160, xl: 240 } as const
const BACKED = 1.45

/** The emoji drawn for a name: the emoji of that name, or the one an icon name maps to. */
export function emojiName(v: unknown): string | undefined {
  return typeof v === 'string' ? emojiForIcon(v.trim().toLowerCase().replace(/[\s_]+/g, '-')) : undefined
}

export function emojiSide(props: EmojiProps, box: { width: number; height: number }): number {
  const step = EMOJI_PX[props.size as keyof typeof EMOJI_PX] ?? EMOJI_PX.md
  const room = Math.min(box.width > 0 ? box.width : Infinity, box.height > 0 ? box.height : Infinity)
  const k = props.backing === 'sticker' || props.backing === 'disc' ? BACKED : 1
  return Math.max(1, Math.min(step, room / k))
}

export function layout(props: EmojiProps, ctx: LayoutContext): LayoutNode {
  const side = emojiSide(props, ctx.box)
  const backed = props.backing === 'sticker' || props.backing === 'disc'
  const d = backed ? Math.round(side * BACKED) : side
  const off = (d - side) / 2
  const name = emojiName(props.emoji)
  const url = name ? emojiUrl(name) : undefined
  const glyph: LayoutNode = url
    ? { k: 'image', part: 'emoji', box: { x: off, y: off, width: side, height: side }, assetId: `emoji:${name}`, alt: name!.replace(/-/g, ' '), fit: 'contain', url }
    : iconLeaf('help-circle', { x: off, y: off, width: side, height: side }, ctx.resolveColor('textMuted').color, 'emoji')
  const back: LayoutNode[] = !backed
    ? []
    : props.backing === 'sticker'
      ? [{ k: 'rect', part: 'emoji.disc', box: { x: 0, y: 0, width: d, height: d }, fill: { type: 'solid', color: '#ffffff' }, radius: d / 2, shadow: 1 }]
      : [{ k: 'rect', part: 'emoji.disc', box: { x: 0, y: 0, width: d, height: d }, fill: { type: 'solid', color: tintOf(ctx.resolveColor('surface').color, ctx.resolveColor('accent').color, 0.18) }, radius: d / 2 }]
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: d, height: d }, children: [...back, glyph] }
}

export function intrinsicSize(props: EmojiProps, _ctx: LayoutContext) {
  const s = emojiSide(props, { width: 0, height: 0 })
  const d = props.backing === 'sticker' || props.backing === 'disc' ? Math.round(s * BACKED) : s
  return { width: d, height: d }
}

export function lint(props: EmojiProps): LintFinding[] {
  if (emojiName(props.emoji)) return []
  return [{ level: 'warning', rule: 'emoji/unknown', message: `Unknown emoji "${String(props.emoji)}" (try rocket, light-bulb, party-popper, thinking-face, books, trophy).` }]
}
