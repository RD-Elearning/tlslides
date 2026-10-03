/**
 * Pure layout for tls.m.logo — one logo fitted (never cropped) inside a fixed height.
 *
 * `fit: contain` always. With a known aspect ratio (`ratio`, or the asset table's natural size) the
 * image box is exact, so `align` and the optional plate hug the logo in both renderers; without
 * one the logo takes the full width and is centred by `contain` (align has nothing to move).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, LintFinding } from '../../../types'
import type { LogoProps } from './schema'
import { altFindings, enumOf, imageLeaf, logoRatio, side } from '../_kit'

export const LOGO_PX = { sm: 64, md: 96, lg: 144 } as const

export function layout(props: LogoProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const size = enumOf(props.maxHeight, ['md', 'sm', 'lg'] as const, 'md')
  const align = enumOf(props.align, ['center', 'start', 'end'] as const, 'center')
  const plate = enumOf(props.plate, ['none', 'surface', 'alt'] as const, 'none')
  const r = logoRatio(ctx, props.image, props.ratio)
  const pad = plate === 'none' ? 0 : Math.min(Math.round(LOGO_PX[size] * 0.25), Math.floor(Math.min(W, H) / 4))
  const maxH = Math.max(1, Math.min(LOGO_PX[size], H - 2 * pad))
  const availW = Math.max(1, W - 2 * pad)
  let lw = availW
  let lh = maxH
  if (r !== undefined) {
    lh = Math.min(maxH, availW / r)
    lw = lh * r
  }
  const outerW = Math.min(W, lw + 2 * pad)
  const outerH = lh + 2 * pad
  const known = r !== undefined
  const x0 = known ? (align === 'start' ? 0 : align === 'end' ? W - outerW : (W - outerW) / 2) : 0
  const out: LayoutNode[] = []
  if (plate !== 'none') {
    out.push({
      k: 'rect',
      part: 'logo.plate',
      box: { x: known ? x0 : 0, y: 0, width: known ? outerW : W, height: outerH },
      fill: { type: 'solid', color: ctx.resolveColor(plate === 'alt' ? 'surfaceAlt' : 'surface').color },
      radius: Math.min(ctx.tokens.radius.md, outerH / 2),
      ...(plate === 'surface' ? { stroke: { color: ctx.resolveColor('line').color, width: 2 } } : {}),
    })
  }
  out.push(imageLeaf(ctx, props.image, props.alt, { x: known ? x0 + pad : pad, y: pad, width: known ? lw : availW, height: lh }, { part: 'logo', fit: 'contain' }))
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: Math.min(H, outerH) }, children: out }
}

export function lint(props: LogoProps): LintFinding[] {
  return altFindings([{ src: props.image, alt: props.alt, part: 'logo' }])
}
