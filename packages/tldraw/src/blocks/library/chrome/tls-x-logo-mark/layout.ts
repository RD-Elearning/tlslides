/**
 * Pure layout for tls.x.logo-mark — a small logo fitted (never cropped) into one corner of its box.
 *
 * Same `ratio` convention as `tls.m.logo`: the explicit slot, else the asset table's natural size.
 * With a known ratio the image box is exact, so `corner` moves it to the left or right and, for the
 * bottom corners, to the bottom of the box. With no ratio the image takes the full width and
 * `contain` centres it, so `corner` has no horizontal effect. Top corners hug the logo's height;
 * bottom corners keep the full box height (the logo needs the box to sit at its bottom).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, LintFinding } from '../../../types'
import type { LogoMarkProps } from './schema'
import { altFindings, enumOf, imageLeaf, logoRatio, side } from '../../media/_kit'

export const MARK_PX = { sm: 36, md: 56 } as const

export function layout(props: LogoMarkProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const size = enumOf(props.size, ['sm', 'md'] as const, 'sm')
  const corner = enumOf(props.corner, ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const, 'top-right')
  const r = logoRatio(ctx, props.image, props.ratio)
  const maxH = Math.max(1, Math.min(MARK_PX[size], H))
  let lw = Math.max(1, W)
  let lh = maxH
  if (r !== undefined) {
    lh = Math.min(maxH, Math.max(1, W) / r)
    lw = lh * r
  }
  const bottom = corner.startsWith('bottom')
  const x = r === undefined ? 0 : corner.endsWith('left') ? 0 : W - lw
  const y = bottom ? Math.max(0, H - lh) : 0
  const image = imageLeaf(ctx, props.image, props.alt, { x, y, width: lw, height: lh }, { part: 'logo', fit: 'contain' })
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: bottom ? H : Math.min(H, lh) }, children: [image] }
}

export function lint(props: LogoMarkProps): LintFinding[] {
  return altFindings([{ src: props.image, alt: props.alt, part: 'logo' }])
}
