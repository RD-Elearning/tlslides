/**
 * Poster for tls.c.journey: the settled frame (path drawn, every node and label in place).
 * Same geometry and parts as the template.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle, RichText } from '../../../types'
import { tryHexToRgb } from '../../../color-math'
import { backdrop, centerLines, color, safe } from '../_showcase'
import type { JourneyProps } from './schema'
import { geometry, labelTokens, milestonesOf } from './schema'

function alpha(hex: string, a: number): string {
  const rgb = tryHexToRgb(hex)
  return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${a})` : hex
}

export function poster(props: JourneyProps, ctx: LayoutContext): LayoutNode {
  const W = safe(ctx.box.width)
  const H = safe(ctx.box.height)
  const items = milestonesOf(props)
  const g = geometry(W, H, items.length)
  const full = { x: 0, y: 0, width: W, height: H }
  const accent = color(ctx, 'accent')
  const tok = labelTokens(items.length)
  const children: LayoutNode[] = [backdrop(W, H)]

  if (items.length > 0) children.push({ k: 'path', part: 'path', box: full, d: g.d, stroke: { color: accent, width: g.stroke } })

  const whenStyle: ResolvedTextStyle = { ...ctx.resolveText('caption', { letterSpacing: 0.06 }), color: accent }
  const titleStyle: ResolvedTextStyle = { ...ctx.resolveText(tok.title), lineHeight: 1.25, color: color(ctx, 'text') }
  const textStyle: ResolvedTextStyle = { ...ctx.resolveText(tok.text), color: color(ctx, 'textMuted') }

  items.forEach((m, i) => {
    const n = g.nodes[i]
    const part = `node[${i}]`
    const halo = g.r * 1.6
    children.push({ k: 'rect', part, box: { x: n.x - halo, y: n.y - halo, width: halo * 2, height: halo * 2 }, radius: halo, fill: { type: 'solid', color: alpha(accent, 0.22) } })
    children.push({ k: 'rect', part, box: { x: n.x - g.r, y: n.y - g.r, width: g.r * 2, height: g.r * 2 }, radius: g.r, fill: { type: 'solid', color: accent } })

    const x = n.x - g.labelW / 2
    const rich = (text: string): RichText => ({ runs: [{ text, bold: true }] })
    const pieces: Array<{ m: ReturnType<LayoutContext['measureText']>; style: ResolvedTextStyle; gap: number; bold: boolean }> = [
      { m: ctx.measureText(rich(m.when.toUpperCase()), whenStyle, g.labelW), style: whenStyle, gap: 0, bold: true },
      { m: ctx.measureText(rich(m.title), titleStyle, g.labelW), style: titleStyle, gap: 4, bold: true },
    ]
    if (m.text) pieces.push({ m: ctx.measureText(m.text, textStyle, g.labelW), style: textStyle, gap: 6, bold: false })
    const total = pieces.reduce((s, p) => s + p.gap + p.m.height, 0)
    // Above the path the stack ends at the node gap; below it starts there. Clamp into the box.
    let y = n.above ? n.y - g.gap - total : n.y + g.gap
    y = Math.max(0, Math.min(y, H - total))
    for (const p of pieces) {
      y += p.gap
      const node = { k: 'text', part: `label[${i}]`, box: { x, y, width: g.labelW, height: p.m.height }, lines: p.m.lines, style: p.style } as Extract<LayoutNode, { k: 'text' }>
      children.push(...centerLines(node, p.bold))
      y += p.m.height
    }
  })

  return { k: 'group', part: 'root', box: full, children }
}
