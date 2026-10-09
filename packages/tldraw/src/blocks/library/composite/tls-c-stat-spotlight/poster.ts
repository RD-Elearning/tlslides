/**
 * Poster for tls.c.stat-spotlight: the settled frame (full value, arc drawn to its progress).
 * Same geometry as the template (`geometry()` in schema.ts) and the same parts.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import { lineWidth } from '../_kit'
import { backdrop, color, safe, str } from '../_showcase'
import type { StatSpotlightProps } from './schema'
import { geometry, progressOf, statsOf, SPOT } from './schema'
import { cssTextHeight } from '../../../html-block'

/** Arc path from the top, clockwise, `p` of a full turn (two halves when p ~ 1). */
export function arcPath(cx: number, cy: number, r: number, p: number): string {
  const f = (n: number) => Math.round(n * 100) / 100
  if (r <= 0 || p <= 0) return `M ${f(cx)} ${f(cy - r)}`
  if (p >= 0.999) {
    return `M ${f(cx)} ${f(cy - r)} A ${f(r)} ${f(r)} 0 1 1 ${f(cx)} ${f(cy + r)} A ${f(r)} ${f(r)} 0 1 1 ${f(cx)} ${f(cy - r)}`
  }
  const a = -Math.PI / 2 + p * 2 * Math.PI
  const x = cx + r * Math.cos(a)
  const y = cy + r * Math.sin(a)
  return `M ${f(cx)} ${f(cy - r)} A ${f(r)} ${f(r)} 0 ${p > 0.5 ? 1 : 0} 1 ${f(x)} ${f(y)}`
}

export function poster(props: StatSpotlightProps, ctx: LayoutContext): LayoutNode {
  const W = safe(ctx.box.width)
  const H = safe(ctx.box.height)
  const g = geometry(W, H, props)
  const children: LayoutNode[] = [backdrop(W, H)]
  const full = { x: 0, y: 0, width: W, height: H }
  const cx = g.ringX + g.d / 2
  const cy = g.ringY + g.d / 2
  const r = Math.max(0, g.d / 2 - g.sw / 2)

  children.push({
    k: 'group',
    part: 'ring',
    box: full,
    children: [
      { k: 'path', box: full, d: arcPath(cx, cy, r, 1), stroke: { color: color(ctx, 'surfaceAlt'), width: g.sw } },
      { k: 'path', box: full, d: arcPath(cx, cy, r, progressOf(props)), stroke: { color: color(ctx, 'accent'), width: g.sw } },
    ],
  })

  const value = str(props.value, 12)
  // LO7: the template's metrics (it paints these lines); text heights are CSS line boxes.
  const vStyle = { ...ctx.resolveText('display', { letterSpacing: SPOT.valueTracking }), size: g.valueSize, lineHeight: SPOT.valueLH, color: color(ctx, 'text') }
  const vm = ctx.measureText({ runs: [{ text: value, bold: true }] }, vStyle, Math.max(1, g.d * 2))
  const vw = Math.min(g.d, Math.max(vm.lines[0]?.width ?? 0, lineWidth(value, vStyle) * 1.12))
  children.push({
    k: 'text',
    part: 'value',
    propPath: 'value',
    box: { x: g.ringX + (g.d - vw) / 2, y: g.ringY + (g.d - g.valueSize) / 2, width: Math.max(1, vw), height: g.valueSize },
    lines: vm.lines.slice(0, 1),
    style: vStyle,
  })

  const lStyle = { ...ctx.resolveText('heading', { letterSpacing: 0, lineHeight: SPOT.labelLH }), color: color(ctx, 'text') }
  const lm = ctx.measureText({ runs: [{ text: str(props.label, 40), bold: true }] }, lStyle, g.colW)
  const lH = cssTextHeight(lm.lines.length, lStyle)
  const context = str(props.context, 100)
  const cStyle = { ...ctx.resolveText('lead', { letterSpacing: 0, lineHeight: SPOT.contextLH }), color: color(ctx, 'textMuted') }
  const cm = context ? ctx.measureText(context, cStyle, g.colW) : undefined
  const cH = cm ? cssTextHeight(cm.lines.length, cStyle) : 0
  const colH = lH + (cm ? SPOT.contextGap + cH : 0)
  // `safe center` in the template: a column taller than the band starts at its top.
  let y = Math.max(0, (g.mainH - colH) / 2)
  children.push({ k: 'text', part: 'label', propPath: 'label', box: { x: g.colX, y, width: g.colW, height: lH }, lines: lm.lines, style: lStyle })
  y += lH + SPOT.contextGap
  if (cm) children.push({ k: 'text', part: 'context', propPath: 'context', box: { x: g.colX, y, width: g.colW, height: cH }, lines: cm.lines, style: cStyle })

  const stats = statsOf(props)
  if (stats.length) {
    const gap = SPOT.statGap
    const w = Math.max(1, (W - gap * (stats.length - 1)) / stats.length)
    const svStyle = { ...ctx.resolveText('heading', { letterSpacing: 0, lineHeight: SPOT.statValueLH }), color: color(ctx, 'text') }
    const slStyle = { ...ctx.resolveText('caption', { letterSpacing: 0, lineHeight: SPOT.statLabelLH }), color: color(ctx, 'textMuted') }
    const inset = SPOT.statBorder + SPOT.statPadLeft
    stats.forEach((s, i) => {
      const x = i * (w + gap)
      const inner = Math.max(1, w - inset)
      const sv = ctx.measureText({ runs: [{ text: s.value, bold: true }] }, svStyle, inner)
      const sl = ctx.measureText(s.label, slStyle, inner)
      const part = `stat[${i}]`
      children.push({ k: 'rect', part, box: { x, y: g.statsY, width: 6, height: g.statsH }, fill: { type: 'solid', color: color(ctx, i % 2 ? 'accent2' : 'accent') } })
      const svH = Math.min(cssTextHeight(1, svStyle), g.statsH)
      children.push({ k: 'text', part, propPath: `stats.${i}.value`, box: { x: x + inset, y: g.statsY + SPOT.statPadTop, width: inner, height: svH }, lines: sv.lines.slice(0, 1), style: svStyle })
      const slY = g.statsY + SPOT.statPadTop + svH + SPOT.statLabelGap
      // Only whole lines that fit above the band's bottom edge (SVG glyphs would spill past it).
      const lineH = slStyle.size * slStyle.lineHeight
      const fit = Math.min(2, sl.lines.length, Math.floor((g.statsY + g.statsH - slY) / lineH))
      if (fit > 0) children.push({ k: 'text', part, propPath: `stats.${i}.label`, box: { x: x + inset, y: slY, width: inner, height: fit * lineH }, lines: sl.lines.slice(0, fit), style: slStyle })
    })
  }

  const height = Math.max(H, colH, g.statsY + g.statsH)
  children[0] = backdrop(W, height)
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height }, children }
}
