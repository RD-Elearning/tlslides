/**
 * Pure layout for tls.m.avatar — portrait (or initials) with name and role.
 *
 * `stacked` centres the portrait with the text under it; `inline` puts the text beside it. The
 * portrait shrinks to fit a small box, never the text. A missing image gives initials on a
 * `surfaceAlt` disc. Parts: `photo` (+ `.ring`, `.initials`), `name`, `role`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, TypeToken } from '../../../types'
import type { AvatarProps } from './schema'
import { avatarLeaves, enumOf, readableOn, side, str } from '../_kit'
import { isShown } from '../../../schema-helpers'
import { linesHeight, placeLines } from '../../diagram/_kit'

export const AVATAR_PX = { sm: 72, md: 120, lg: 180, xl: 260 } as const
const NAME_TOKEN: Record<string, TypeToken> = { sm: 'body', md: 'lead', lg: 'subheading', xl: 'heading' }
const ROLE_TOKEN: Record<string, TypeToken> = { sm: 'footnote', md: 'caption', lg: 'body', xl: 'lead' }

export function layout(props: AvatarProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const size = enumOf(props.size, ['md', 'sm', 'lg', 'xl'] as const, 'md')
  const shape = enumOf(props.shape, ['circle', 'rounded', 'square'] as const, 'circle')
  const mode = enumOf(props.layout, ['stacked', 'inline'] as const, 'stacked')
  const name = str(props.name).trim()
  const role = str(props.role).trim()
  const showName = isShown(props, 'showName') && !!name
  const showRole = isShown(props, 'showRole') && !!role
  const nameS = { ...ctx.resolveText(NAME_TOKEN[size]), color: ctx.resolveColor('text').color }
  const roleS = { ...ctx.resolveText(ROLE_TOKEN[size]), color: readableOn(ctx.resolveColor('textMuted').color, ctx.resolveColor('surface').color) }
  const gap = ctx.tokens.space[size === 'sm' ? 'xs' : 'sm']
  const want = AVATAR_PX[size]
  const out: LayoutNode[] = []
  const photo = (x: number, y: number, s: number) =>
    avatarLeaves(ctx, { name, src: props.image, x, y, size: s, shape, part: 'photo', ring: props.ring === true })

  if (mode === 'stacked') {
    const nameH = showName ? linesHeight(ctx, name, nameS, W, 1) : 0
    const roleH = showRole ? linesHeight(ctx, role, roleS, W, 1) : 0
    const textH = nameH + roleH + (nameH && roleH ? 4 : 0)
    const s = Math.max(1, Math.min(want, W, H - (textH ? textH + gap : 0)))
    out.push(...photo((W - s) / 2, 0, s))
    let y = s + gap
    if (showName) {
      const p = placeLines(ctx, name, nameS, { x: 0, y, width: W }, 'center', 1, 'name')
      out.push(...p.nodes)
      y += p.height + 4
    }
    if (showRole) out.push(...placeLines(ctx, role, roleS, { x: 0, y, width: W }, 'center', 1, 'role').nodes)
  } else {
    const s = Math.max(1, Math.min(want, H, W * 0.5))
    out.push(...photo(0, (H - s) / 2 > 0 && !(showName || showRole) ? (H - s) / 2 : Math.max(0, (H - s) / 2), s))
    const x = s + ctx.tokens.space.md
    const tw = Math.max(1, W - x)
    const nameH = showName ? linesHeight(ctx, name, nameS, tw, 1) : 0
    const roleH = showRole ? linesHeight(ctx, role, roleS, tw, 1) : 0
    const total = nameH + roleH + (nameH && roleH ? 4 : 0)
    let y = Math.max(0, (H - total) / 2)
    if (showName) {
      const p = placeLines(ctx, name, nameS, { x, y, width: tw }, 'start', 1, 'name')
      out.push(...p.nodes)
      y += p.height + 4
    }
    if (showRole) out.push(...placeLines(ctx, role, roleS, { x, y, width: tw }, 'start', 1, 'role').nodes)
  }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: out }
}
