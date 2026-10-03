/**
 * Pure layout for tls.d.gauge — a half-circle dial from 9 o'clock over the top to 3 o'clock.
 *
 * Bands are annular sectors coloured by tone role (negative / warning / positive / neutral); any
 * stretch of the scale they do not cover stays a quiet track. Without bands the dial is a track
 * with an accent fill up to the value. The value is clamped for the pointer; the printed number is
 * always the real one.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { GaugeProps } from './schema'
import { GAUGE_MAX_BANDS, GAUGE_TONES } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, dot, enumOf, fmtNum, lineH, mutedStyle, numOrNull, pathNode, ringArcPath, root, str, style,
  textAligned, TEXT_SLACK,
} from '../_chart/kit'

export function layout(props: GaugeProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const c = chartColors(ctx)
  const sp = ctx.tokens.space
  const lo = numOrNull(props.min) ?? 0
  let hi = numOrNull(props.max) ?? 100
  if (!(hi > lo)) hi = lo + 1
  const value = numOrNull(props.value) ?? lo
  const frac = clamp((value - lo) / (hi - lo), 0, 1)
  const ang = (v: number) => Math.PI + clamp((v - lo) / (hi - lo), 0, 1) * Math.PI

  const bands = asArr<Record<string, unknown>>(props.bands)
    .map((b) => ({ to: numOrNull(b?.to), tone: enumOf(b?.tone, GAUGE_TONES, 'neutral') }))
    .filter((b): b is { to: number; tone: (typeof GAUGE_TONES)[number] } => b.to !== null)
    .slice(0, GAUGE_MAX_BANDS)
    .sort((a, b) => a.to - b.to)
  const showTicks = props.showTicks !== false
  const label = str(props.label)

  const tickStyle = mutedStyle(ctx, 'footnote')
  const tlh = lineH(tickStyle)
  const labelStyle = style(ctx, 'caption', c.text)
  const labelH = label ? lineH(labelStyle) : 0
  const valueText = fmtNum(value, props.format)

  // Vertical budget: arc, then value, then label.
  let vs = style(ctx, 'heading', c.text)
  const tickW = showTicks ? Math.ceil(Math.max(ctx.measureText(fmtNum(lo, props.format), tickStyle).width, ctx.measureText(fmtNum(hi, props.format), tickStyle).width) * TEXT_SLACK) + 12 : 0
  const gapV = sp['2xs']
  const topMargin = showTicks ? tlh + 6 : 4
  for (let k = 0; k < 6; k++) {
    const below = 14 + lineH(vs) + (labelH ? gapV + labelH : 0)
    const R0 = Math.min(W / 2 - tickW, H - below - topMargin)
    if (R0 >= 40 || lineH(vs) < 14) break
    vs = { ...vs, size: vs.size * 0.85 }
  }
  const below = 14 + lineH(vs) + (labelH ? gapV + labelH : 0)
  let R = Math.min(W / 2 - tickW, H - below - topMargin)
  if (!(R > 8)) R = Math.max(8, Math.min(W / 2, H * 0.5) - 4)
  const t = R * 0.24
  const Ri = R - t
  const rm = (R + Ri) / 2
  const cx = W / 2
  const cy = topMargin + R + Math.max(0, (H - below - topMargin - R) / 2)

  const nodes: LayoutNode[] = []
  const tone = (name: string) => ctx.resolveColor(name === 'neutral' ? 'neutral' : name).color
  const surfaceStroke = { stroke: c.surface, strokeWidth: 3 }

  if (bands.length > 0) {
    let prev = lo
    let i = 0
    for (const b of bands) {
      const to = clamp(b.to, lo, hi)
      if (to > prev) {
        nodes.push(pathNode(ctx, ringArcPath(cx, cy, R, Ri, ang(prev), ang(to)), `bands[${i}]`, { fill: tone(b.tone), ...surfaceStroke }))
        i++
        prev = to
      }
    }
    if (prev < hi - 1e-9) nodes.push(pathNode(ctx, ringArcPath(cx, cy, R, Ri, ang(prev), ang(hi)), `bands[${i}]`, { fill: c.track, ...surfaceStroke }))
  } else {
    nodes.push(pathNode(ctx, ringArcPath(cx, cy, R, Ri, Math.PI, Math.PI * 2), 'bands[0]', { fill: c.track }))
    if (frac > 0) nodes.push(pathNode(ctx, ringArcPath(cx, cy, R, Ri, Math.PI, ang(value)), 'bands[1]', { fill: c.accent }))
  }

  // Ticks at the scale ends and at every band boundary.
  if (showTicks) {
    const marks = Array.from(new Set([lo, ...bands.map((b) => clamp(b.to, lo, hi)), hi])).sort((a, b) => a - b)
    marks.forEach((v, i) => {
      const a = ang(v)
      const cs = Math.cos(a)
      const sn = Math.sin(a)
      nodes.push(pathNode(ctx, `M${cx + (R + 3) * cs} ${cy + (R + 3) * sn}L${cx + (R + 12) * cs} ${cy + (R + 12) * sn}`, `tick[${i}]`, { stroke: c.muted, strokeWidth: 2 }))
      const txt = fmtNum(v, props.format)
      const tw = ctx.measureText(txt, tickStyle).width * 1.12
      const px = cx + (R + 18) * cs
      const py = cy + (R + 18) * sn
      const align = cs > 0.35 ? 'start' : cs < -0.35 ? 'end' : 'center'
      const x = align === 'start' ? px : align === 'end' ? px - tw : px - tw / 2
      const y = py - tlh / 2 + sn * (tlh / 2)
      nodes.push(...textAligned(ctx, txt, tickStyle, { x: clamp(x, 0, Math.max(0, W - tw)), y: Math.max(0, y), width: tw }, 'start', `tick[${i}].label`).nodes)
    })
  }

  // Pointer.
  const a = ang(value)
  const pointer = enumOf(props.needle, ['needle', 'marker'] as const, 'needle')
  if (pointer === 'needle') {
    const L = R - t * 0.3
    const hw = Math.max(3, R * 0.045)
    const tip = { x: cx + L * Math.cos(a), y: cy + L * Math.sin(a) }
    const b1 = { x: cx + hw * Math.cos(a + Math.PI / 2), y: cy + hw * Math.sin(a + Math.PI / 2) }
    const b2 = { x: cx + hw * Math.cos(a - Math.PI / 2), y: cy + hw * Math.sin(a - Math.PI / 2) }
    nodes.push(pathNode(ctx, `M${b1.x} ${b1.y}L${tip.x} ${tip.y}L${b2.x} ${b2.y}Z`, 'needle', { fill: c.text }))
    nodes.push(dot(cx, cy, hw * 1.6, c.text, 'needle.hub'))
  } else {
    nodes.push(dot(cx + rm * Math.cos(a), cy + rm * Math.sin(a), t * 0.4, c.surface, 'needle', c.text))
  }

  // Value and label under the hub.
  const inner = Math.max(1, Ri * 1.7)
  for (let k = 0; k < 6; k++) {
    if (ctx.measureText(valueText, vs).width * TEXT_SLACK <= inner) break
    vs = { ...vs, size: vs.size * 0.88 }
  }
  let y = cy + 14
  nodes.push(...textAligned(ctx, valueText, vs, { x: cx - inner / 2, y, width: inner }, 'center', 'value').nodes)
  y += lineH(vs) + gapV
  if (label) {
    const w = Math.min(W, Math.max(60, W * 0.9))
    nodes.push(...textAligned(ctx, label, labelStyle, { x: cx - w / 2, y, width: w }, 'center', 'label').nodes.slice(0, 1))
  }
  return root(ctx, nodes)
}

export function capacity(props: GaugeProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf({ bands: { max: GAUGE_MAX_BANDS, used: asArr(props.bands).length } }, true, [{ kind: 'truncate', slot: 'bands' }])
}
