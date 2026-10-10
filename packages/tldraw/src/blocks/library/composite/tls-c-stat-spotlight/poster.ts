/**
 * Poster for tls.c.stat-spotlight: the settled frame (full value, arc drawn to its progress).
 * Same geometry as the template (`geometry()` in schema.ts) and the same parts.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import { lineWidth } from '../_kit'
import { backdrop, color, safe, str } from '../_showcase'
import type { StatSpotlightProps } from './schema'
import { geometry, progressOf, statsOf, SPOT, SPOT_ROOMY } from './schema'
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

  if (g.ring) children.push({
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

  const context = str(props.context, 100)
  const cStyle = { ...ctx.resolveText('lead', { letterSpacing: 0, lineHeight: SPOT.contextLH }), color: color(ctx, 'textMuted') }
  const cm = context ? ctx.measureText(context, cStyle, g.colW) : undefined
  const cH = cm ? cssTextHeight(cm.lines.length, cStyle) : 0
  // AC8.6: the roomy tier sets the label at `title` when it takes at most two lines and the column
  // still fits the band; else `heading` (the compact tier).
  const labelAt = (token: 'title' | 'heading') => {
    const style = { ...ctx.resolveText(token, { letterSpacing: 0, lineHeight: SPOT.labelLH }), color: color(ctx, 'text') }
    const m = ctx.measureText({ runs: [{ text: str(props.label, 40), bold: true }] }, style, g.colW)
    return { style, m, h: cssTextHeight(m.lines.length, style) }
  }
  let lab = labelAt('heading')
  if (g.roomy) {
    const big = labelAt('title')
    if (big.m.lines.length <= SPOT_ROOMY.labelLines && big.h + (cm ? SPOT.contextGap + cH : 0) <= g.mainH) lab = big
  }
  const { style: lStyle, m: lm, h: lH } = lab
  const colH = lH + (cm ? SPOT.contextGap + cH : 0)
  // `safe center` in the template: a column taller than the band starts at its top.
  let y = Math.max(0, (g.mainH - colH) / 2)
  children.push({ k: 'text', part: 'label', propPath: 'label', box: { x: g.colX, y, width: g.colW, height: lH }, lines: lm.lines, style: lStyle })
  y += lH + SPOT.contextGap
  if (cm) children.push({ k: 'text', part: 'context', propPath: 'context', box: { x: g.colX, y, width: g.colW, height: cH }, lines: cm.lines, style: cStyle })

  const stats = statsOf(props)
  if (stats.length) {
    const inset = SPOT.statBorder + SPOT.statPadLeft
    const styles = (value: 'title' | 'heading', label: 'lead' | 'caption') => ({
      sv: { ...ctx.resolveText(value, { letterSpacing: 0, lineHeight: SPOT.statValueLH }), color: color(ctx, 'text') },
      sl: { ...ctx.resolveText(label, { letterSpacing: 0, lineHeight: SPOT.statLabelLH }), color: color(ctx, 'textMuted') },
    })
    // AC8.6: the roomy tier (title values, lead labels) when every value keeps one line and every
    // label at least one whole line in its band; else the compact tier (heading, caption).
    let { sv: svStyle, sl: slStyle } = styles('heading', 'caption')
    if (g.roomy) {
      const big = styles('title', 'lead')
      const fits = stats.every((s, i) => {
        const inner = Math.max(1, g.stats[i].width - inset)
        if (ctx.measureText({ runs: [{ text: s.value, bold: true }] }, big.sv, inner).lines.length > 1) return false
        const room = g.stats[i].height - SPOT.statPadTop - cssTextHeight(1, big.sv) - SPOT.statLabelGap
        const lines = ctx.measureText(s.label, big.sl, inner).lines.length
        return room >= big.sl.size * big.sl.lineHeight * Math.min(lines, 2)
      })
      if (fits) ({ sv: svStyle, sl: slStyle } = big)
    }
    stats.forEach((s, i) => {
      const box = g.stats[i]
      const x = box.x
      const inner = Math.max(1, box.width - inset)
      const sv = ctx.measureText({ runs: [{ text: s.value, bold: true }] }, svStyle, inner)
      const sl = ctx.measureText(s.label, slStyle, inner)
      const part = `stat[${i}]`
      children.push({ k: 'rect', part, box: { x, y: box.y, width: 6, height: box.height }, fill: { type: 'solid', color: color(ctx, i % 2 ? 'accent2' : 'accent') } })
      const svH = Math.min(cssTextHeight(1, svStyle), box.height)
      children.push({ k: 'text', part, propPath: `stats.${i}.value`, box: { x: x + inset, y: box.y + SPOT.statPadTop, width: inner, height: svH }, lines: sv.lines.slice(0, 1), style: svStyle })
      const slY = box.y + SPOT.statPadTop + svH + SPOT.statLabelGap
      // Only whole lines that fit above the band's bottom edge (SVG glyphs would spill past it).
      const lineH = slStyle.size * slStyle.lineHeight
      const fit = Math.min(2, sl.lines.length, Math.floor((box.y + box.height - slY) / lineH))
      if (fit > 0) children.push({ k: 'text', part, propPath: `stats.${i}.label`, box: { x: x + inset, y: slY, width: inner, height: fit * lineH }, lines: sl.lines.slice(0, fit), style: slStyle })
    })
  }

  const height = Math.max(H, colH, g.statsY + g.statsH, ...g.stats.map((b) => b.y + b.height))
  children[0] = backdrop(W, height)
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height }, children }
}
