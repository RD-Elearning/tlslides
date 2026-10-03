/**
 * Poster for tls.c.feature-reveal: the settled card grid. Same geometry and parts as the template.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle } from '../../../types'
import { tryHexToRgb } from '../../../color-math'
import { iconLeaf } from '../../text/_engine/icon'
import { backdrop, color, safe } from '../_showcase'
import type { FeatureRevealProps } from './schema'
import { geometry, itemsOf } from './schema'

function alpha(hex: string, a: number): string {
  const rgb = tryHexToRgb(hex)
  return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${a})` : hex
}

/** Lines of a measured text that fit in `room` (whole lines only). */
function fitLines(m: ReturnType<LayoutContext['measureText']>, style: ResolvedTextStyle, room: number) {
  const lh = style.size * style.lineHeight
  const n = Math.max(0, Math.min(m.lines.length, Math.floor(room / lh)))
  return { lines: m.lines.slice(0, n), height: n * lh }
}

export function poster(props: FeatureRevealProps, ctx: LayoutContext): LayoutNode {
  const W = safe(ctx.box.width)
  const H = safe(ctx.box.height)
  const items = itemsOf(props)
  const g = geometry(W, H, items.length)
  const accent = color(ctx, 'accent')
  const titleStyle: ResolvedTextStyle = { ...ctx.resolveText(g.compact ? 'body' : 'lead'), lineHeight: 1.25, color: color(ctx, 'text') }
  const textStyle: ResolvedTextStyle = { ...ctx.resolveText(g.compact ? 'caption' : 'body'), lineHeight: 1.45, color: color(ctx, 'textMuted') }
  const children: LayoutNode[] = [backdrop(W, H)]

  items.forEach((m, i) => {
    const b = g.cards[i]
    children.push({ k: 'rect', part: `card[${i}]`, box: { x: b.x, y: b.y, width: b.w, height: b.h }, radius: 24, fill: { type: 'solid', color: color(ctx, 'surfaceAlt') } })
    const ix = b.x + g.pad
    let y = b.y + g.pad
    const icon = Math.min(g.icon, Math.max(0, b.h - g.pad * 2), Math.max(0, b.w - g.pad * 2))
    if (icon > 0) {
      children.push({ k: 'rect', part: `icon[${i}]`, box: { x: ix, y, width: icon, height: icon }, radius: icon / 2, fill: { type: 'solid', color: alpha(accent, 0.16) } })
      children.push(iconLeaf(m.icon, { x: ix + icon * 0.225, y: y + icon * 0.225, width: icon * 0.55, height: icon * 0.55 }, accent, `icon[${i}]`))
    }
    y += icon + g.pad * 0.6
    const inner = Math.max(1, b.w - g.pad * 2)
    const bottom = b.y + b.h - g.pad
    const tm = fitLines(ctx.measureText({ runs: [{ text: m.title, bold: true }] }, titleStyle, inner), titleStyle, bottom - y)
    if (tm.height > 0) children.push({ k: 'text', part: `title[${i}]`, box: { x: ix, y, width: inner, height: tm.height }, lines: tm.lines, style: titleStyle })
    y += tm.height + 8
    if (m.text) {
      const xm = fitLines(ctx.measureText(m.text, textStyle, inner), textStyle, bottom - y)
      if (xm.height > 0) children.push({ k: 'text', part: `text[${i}]`, box: { x: ix, y, width: inner, height: xm.height }, lines: xm.lines, style: textStyle })
    }
  })

  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children }
}
