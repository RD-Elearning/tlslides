/**
 * Pure layout for tls.g.staircase — 3-6 levels rising left to right: each step a column whose
 * height grows with its rank, the step's icon, label and note above it, a stair line along the
 * tops (drawn on as the steps rise).
 *
 * The text above a step is measured first; the steps then rise as high as the tallest text above
 * them allows (the highest step leaves the least room), never above 70 % of the box. A note that
 * still does not fit is cut to the lines there are (reported as truncated text).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { StaircaseProps } from './schema'
import { STAIR_MAX } from './schema'
import { asArr, capacityOf, chartColors, emptyState, enumOf, lineH, linesHeight, mutedStyle, objs, onColor, placeLines, rampColor, root, solidRect, str, strokePath, style } from '../_kit'
import { textAligned } from '../../data/_chart/kit'
import { iconLeaf } from '../../text/_engine/icon'
import { slotsByIndex } from '../_motion'

const f = (v: number) => Math.round(v * 100) / 100

export function layout(props: StaircaseProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const steps = objs(props.steps)
    .slice(0, STAIR_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text), icon: str(s.icon) }))
  const N = steps.length
  if (N < 1) return emptyState(ctx, 'No steps')
  const c = chartColors(ctx)
  const fillMode = enumOf(props.fill, ['gradient', 'single', 'series'] as const, 'gradient')
  const numbered = props.numbering !== 'none'
  const sp = ctx.tokens.space
  const gap = Math.max(6, Math.min(sp.sm, W * 0.012))
  const colW = Math.max(8, (W - (N - 1) * gap) / N)
  const labelS = style(ctx, 'subheading', c.text)
  const noteS = mutedStyle(ctx, 'caption')
  const iconSize = Math.max(0, Math.min(56, colW * 0.3, H * 0.11))
  const pad = Math.max(4, colW * 0.06)
  const tw = Math.max(4, colW - 2 * pad)

  // the text each step needs above it (icon, label up to 2 lines, note up to 3 lines)
  const need = steps.map((s) => {
    const ih = s.icon ? iconSize + sp['2xs'] : 0
    const lh = linesHeight(ctx, s.label, labelS, tw, 2)
    const nh = s.text ? linesHeight(ctx, s.text, noteS, tw, 3) + sp['3xs'] : 0
    return ih + lh + nh + sp.xs
  })
  // step heights: from `low` to `high`, the highest step under the text it carries
  const low = Math.max(28, H * 0.14)
  let high = Math.min(H * 0.7, H - need[N - 1])
  for (let i = 0; i < N; i++) {
    // the i-th step is low + (high - low) * i / (N - 1); keep its own text on the page
    const t = N > 1 ? i / (N - 1) : 1
    if (t > 0) high = Math.min(high, low + (H - need[i] - low) / t)
  }
  high = Math.max(low + 8, high)
  const hOf = (i: number) => (N > 1 ? low + ((high - low) * i) / (N - 1) : high)

  const nodes: LayoutNode[] = []
  const tops: Array<{ x0: number; x1: number; y: number }> = []
  steps.forEach((s, i) => {
    const x = i * (colW + gap)
    const h = hOf(i)
    const y = H - h
    tops.push({ x0: x, x1: x + colW, y })
    const fill = rampColor(ctx, fillMode, N - 1 - i, N)
    nodes.push({ ...solidRect({ x, y, width: colW, height: h }, fill, `step[${i}]`, Math.min(10, colW * 0.06)), radius: [Math.min(10, colW * 0.06), Math.min(10, colW * 0.06), 0, 0] } as LayoutNode)
    if (numbered) {
      const ns = { ...style(ctx, 'heading', onColor(ctx, fill)) }
      const off = Math.max(2, Math.min(sp.xs, h * 0.12))
      const maxLH = h - 2 * off
      if (lineH(ns) > maxLH) ns.size = Math.max(1, maxLH / ns.lineHeight)
      if (maxLH >= 8) nodes.push(...textAligned(ctx, String(i + 1), ns, { x: x + pad, y: y + off, width: tw }, 'start', `num[${i}]`).nodes)
    }
    // text above the step, bottom-aligned on it
    const room = Math.max(0, y - sp.xs)
    const ih = s.icon ? iconSize + sp['2xs'] : 0
    const lh = Math.min(linesHeight(ctx, s.label, labelS, tw, 2), Math.max(0, room - ih))
    const labelLines = Math.max(0, Math.floor(lh / lineH(labelS)))
    const noteRoom = Math.max(0, room - ih - labelLines * lineH(labelS) - sp['3xs'])
    const noteLines = s.text ? Math.min(3, Math.floor(noteRoom / lineH(noteS))) : 0
    const nh = noteLines > 0 ? linesHeight(ctx, s.text, noteS, tw, noteLines) : 0
    let ty = y - sp.xs - nh - (nh ? sp['3xs'] : 0) - labelLines * lineH(labelS) - ih
    ty = Math.max(0, ty)
    if (s.icon && iconSize > 4 && ih <= room) {
      nodes.push(iconLeaf(s.icon, { x: x + pad, y: ty, width: iconSize, height: iconSize }, ctx.resolveColor('accent').color, `icon[${i}]`))
      ty += ih
    }
    if (labelLines > 0) {
      const t = placeLines(ctx, s.label, labelS, { x: x + pad, y: ty, width: tw }, 'start', labelLines, `label[${i}]`)
      nodes.push(...t.nodes)
      ty += t.height + sp['3xs']
    }
    if (noteLines > 0) nodes.push(...placeLines(ctx, s.text, noteS, { x: x + pad, y: ty, width: tw }, 'start', noteLines, `note[${i}]`).nodes)
  })

  // the stair line along the step tops, a little above them: across each top, up each riser
  const lift = Math.max(3, Math.min(8, gap * 0.6))
  let d = ''
  tops.forEach((t, i) => {
    const y = f(t.y - lift)
    d += i === 0 ? `M${f(t.x0)} ${y}` : `L${f(t.x0 - gap / 2)} ${f(tops[i - 1].y - lift)}L${f(t.x0 - gap / 2)} ${y}`
    d += `L${f(t.x1)} ${y}`
  })
  const stair = strokePath(ctx, d, 'stair', ctx.resolveColor('accent').color, Math.max(2, lift * 0.6))

  return root(ctx, [
    ...slotsByIndex(nodes, N, { width: W, height: H }, [
      { name: 'rise', match: /^(?:step|num)\[(\d+)\]$/ },
      { name: 'cap', match: /^(?:icon|label|note)\[(\d+)\](?:\.\d+)?$/ },
    ]),
    stair,
  ])
}

export function capacity(props: StaircaseProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ steps: { max: STAIR_MAX, used: asArr(props.steps).length } }, true, [
    { kind: 'truncate', slot: 'steps' },
    { kind: 'paginate' },
  ])
}
