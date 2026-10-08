/**
 * Pure layout for tls.t.callout — boxed note with an icon, optional title and text.
 *
 * Variant -> role: info accent, tip accent2, warning warning, danger negative, success positive.
 * `tint` mixes the role into the surface at a low strength (a flat colour, no alpha), `outline`
 * strokes the role on the surface, `solid` fills with the role. Foreground colours are nudged
 * along their own hue until they read against the actual fill (see `readableOn`).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { ColorRole, LayoutContext, LayoutNode, ResolvedTextStyle } from '../../../types'
import type { CalloutProps, CalloutVariant } from './schema'
import { iconLeaf } from '../_engine/icon'
import { onColor, readableOn, tintOf } from '../_engine/color'
import { str, toMeasurable } from '../_engine/rich'
import { isShown } from '../../../schema-helpers'

export const VARIANTS: Record<CalloutVariant, { role: ColorRole; icon: string }> = {
  info: { role: 'accent', icon: 'info' },
  tip: { role: 'accent2', icon: 'lightbulb' },
  warning: { role: 'warning', icon: 'alert-triangle' },
  danger: { role: 'negative', icon: 'x-circle' },
  success: { role: 'positive', icon: 'check-circle' },
}

export function variantOf(v: unknown): CalloutVariant {
  return typeof v === 'string' && v in VARIANTS ? (v as CalloutVariant) : 'info'
}

/** The resolved colours of one variant/fill pair: what the tests and the layout both use. */
export function calloutColors(ctx: LayoutContext, variant: unknown, fill: unknown) {
  const role = ctx.resolveColor(VARIANTS[variantOf(variant)].role).color
  const surface = ctx.resolveColor('surface').color
  const text = ctx.resolveColor('text').color
  if (fill === 'solid') {
    const ink = readableOn(onColor(ctx, role), role)
    return { fill: role as string | undefined, stroke: undefined as string | undefined, text: ink, title: ink, icon: ink }
  }
  if (fill === 'outline') {
    return { fill: undefined, stroke: role, text, title: readableOn(role, surface), icon: readableOn(role, surface, 3) }
  }
  const bg = tintOf(surface, role, 0.12)
  return { fill: bg, stroke: undefined, text: readableOn(text, bg), title: readableOn(role, bg), icon: readableOn(role, bg, 3) }
}

export function layout(props: CalloutProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const variant = variantOf(props.variant)
  const fill = props.fill === 'outline' || props.fill === 'solid' ? props.fill : 'tint'
  const c = calloutColors(ctx, variant, fill)
  const sp = ctx.tokens.space
  const pad = sp.md
  const body = ctx.resolveText('body')
  const textStyle: ResolvedTextStyle = { ...body, color: c.text }
  const titleStyle: ResolvedTextStyle = { ...body, color: c.title }

  const showIcon = isShown(props, 'showIcon')
  const title = isShown(props, 'showTitle') ? str(props.title) : ''
  const iconSize = Math.round(body.size * 1.2)
  const textX = pad + (showIcon ? iconSize + sp.sm : 0)
  const textW = Math.max(1, width - textX - pad)

  const children: LayoutNode[] = []
  let y = pad
  const tm = title ? ctx.measureText({ runs: [{ text: title, bold: true }] }, titleStyle, textW) : undefined
  if (tm) {
    children.push({
      k: 'text',
      part: 'title',
      box: { x: textX, y, width: textW, height: tm.height },
      lines: tm.lines,
      style: titleStyle,
      propPath: 'title',
    })
    y += tm.height + sp['3xs']
  }
  const bm = ctx.measureText(toMeasurable(props.text), textStyle, textW)
  children.push({
    k: 'text',
    part: 'text',
    box: { x: textX, y, width: textW, height: bm.height },
    lines: bm.lines,
    style: textStyle,
    propPath: 'text',
  })
  y += bm.height
  const height = y + pad

  if (showIcon) {
    const name = typeof props.icon === 'string' && props.icon ? props.icon : VARIANTS[variant].icon
    const first = tm ? titleStyle : textStyle
    const lineH = first.size * first.lineHeight
    children.push(
      iconLeaf(name, { x: pad, y: pad + (lineH - iconSize) / 2, width: iconSize, height: iconSize }, c.icon, 'icon')
    )
  }

  const box: LayoutNode = {
    k: 'rect',
    part: 'box',
    box: { x: 0, y: 0, width, height },
    ...(c.fill ? { fill: { type: 'solid', color: c.fill } as const } : {}),
    ...(c.stroke ? { stroke: { color: c.stroke, width: 2 } } : {}),
    radius: ctx.tokens.radius.md,
  }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height }, children: [box, ...children] }
}
