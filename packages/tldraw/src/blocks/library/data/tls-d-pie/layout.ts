/**
 * Pure layout for tls.d.pie — slices from 12 o'clock (or `startAngle`), clockwise.
 *
 * Labels: `outside` puts name and percent beside the slice with a leader, nudged apart per side so
 * they never overlap; `inside` prints them in the slice when they fit (otherwise outside);
 * `legend` moves the names into a legend on the right. More than six slices fold the tail into a
 * neutral "Other" slice. Zero, negative and non-numeric values are dropped.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, LintFinding, Size } from '../../../types'
import type { PieProps } from './schema'
import { PIE_MAX_SLICES } from './schema'
import { directLabel } from '../_engine/direct-label'
import { highlightColor } from '../_engine/series-color'
import { layoutLegend } from '../_engine/legend'
import {
  asArr, capacityOf, chartColors, clipLines, emptyState, enumOf, isNum, lineH, numOrNull, onColor, pathNode, readCategories, ringArcPath, root, seriesColors, style,
  textAligned, realWidth, TEXT_SLACK,
  withRealWidths,
} from '../_chart/kit'

interface Slice {
  name: string
  value: number
  /** Index in the author's category list (-1 for the folded "Other"). */
  idx: number
}

const FULL = Math.PI * 2

function readSlices(props: PieProps): Slice[] {
  const cats = readCategories(props.categories)
  const vals = asArr<unknown>(props.values)
  let out: Slice[] = []
  const n = Math.max(cats.length, vals.length)
  for (let i = 0; i < n; i++) {
    const v = numOrNull(vals[i])
    if (v !== null && v > 0) out.push({ name: cats[i] ?? `Slice ${i + 1}`, value: v, idx: i })
  }
  if (props.sort !== 'none') out = out.slice().sort((a, b) => b.value - a.value || a.idx - b.idx)
  if (out.length > PIE_MAX_SLICES) {
    const tail = out.slice(PIE_MAX_SLICES - 1)
    out = out.slice(0, PIE_MAX_SLICES - 1).concat({ name: 'Other', value: tail.reduce((t, s) => t + s.value, 0), idx: -1 })
  }
  return out
}

/**
 * What `tls.d.donut` adds to the pie engine: a hole (fraction of the outer radius), explicit slice
 * colours by author index, a `total` larger than the sum (the rest of the ring stays a quiet
 * track) and a centre value with an optional caption.
 */
export interface PieExtra {
  hole?: number
  colors?: Array<string | undefined>
  total?: number
  centre?: { value: string; label?: string }
}

export function layout(props: PieProps, ctx0: LayoutContext, extra?: PieExtra): LayoutNode {
  // Browser-true single-line widths for every label decision (RV05).
  const ctx = withRealWidths(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const slices = readSlices(props)
  const sum = slices.reduce((t, s) => t + s.value, 0)
  if (slices.length === 0 || !(sum > 0)) return emptyState(ctx)
  // A donut `total` above the sum leaves the rest of the ring as an empty track.
  const total = extra?.total !== undefined && isNum(extra.total) && extra.total > sum ? extra.total : sum
  const hole = extra?.hole && extra.hole > 0 && extra.hole < 0.95 ? extra.hole : 0

  const c = chartColors(ctx)
  const labelsMode = enumOf(props.labels, ['outside', 'inside', 'legend'] as const, 'outside')
  const showPct = props.showPercent !== false
  const hl = isNum(props.highlightIndex) && props.highlightIndex >= 0 ? props.highlightIndex : -1
  const base = seriesColors(ctx, slices.length)
  const colorOf = (s: Slice, i: number) => {
    const col = s.idx === -1 ? ctx.resolveColor('neutral').color : extra?.colors?.[s.idx] ?? base[i]
    return hl >= 0 ? highlightColor(s.idx, hl, col, ctx.tokens) : col
  }
  const pctOf = (s: Slice) => `${Math.round((s.value / total) * 100)}%`
  const nodes: LayoutNode[] = []

  const nameStyle = style(ctx, 'caption', c.text)
  const pctStyle = style(ctx, 'caption', c.muted)
  const lh = lineH(nameStyle)
  const start = (isNum(props.startAngle) ? props.startAngle : 0) * (Math.PI / 180) - Math.PI / 2

  // Angles.
  let cum = 0
  const arcs = slices.map((s) => {
    const a0 = start + (cum / total) * Math.PI * 2
    cum += s.value
    const span = slices.length === 1 && total === sum ? FULL : (s.value / total) * Math.PI * 2
    return { a0, a1: a0 + span, span, mid: a0 + span / 2 }
  })

  // Outside / inside labels need room on both sides; a box too small for them falls back to a legend.
  let mode = labelsMode
  if (mode !== 'legend') {
    const widest = Math.max(...slices.map((s) => ctx.measureText(s.name, nameStyle).width))
    const pw = showPct ? Math.max(...slices.map((s) => ctx.measureText(pctOf(s), pctStyle).width)) : 0
    const lw = Math.max(Math.min(W * 0.3, widest * TEXT_SLACK + 2), pw * TEXT_SLACK)
    const rawR = Math.min((W - 2 * (lw + 26)) / 2, (H - 2.2 * lh) / 2)
    const right = arcs.filter((x) => Math.cos(x.mid) >= 0).length
    const stack = Math.max(right, arcs.length - right) * (lh * (showPct ? 2 : 1) + 4)
    if (rawR < Math.max(36, Math.min(W, H) * 0.16) || (mode === 'outside' && stack > H - lh)) mode = 'legend'
  }

  let area = { x: 0, y: 0, width: W, height: H }
  if (mode === 'legend') {
    const lg = layoutLegend(
      slices.map((s, i) => ({ label: showPct ? `${s.name} ${pctOf(s)}` : s.name, color: colorOf(s, i) })),
      area,
      ctx,
      'right'
    )
    nodes.push(...lg.nodes)
    area = lg.plotBox
  }

  // Which labels go outside? (all of them, or the ones that do not fit inside.)
  const wantsInside = mode === 'inside'
  const maxNameW = Math.min(area.width * 0.3, Math.max(...slices.map((s) => ctx.measureText(s.name, nameStyle).width)) * TEXT_SLACK + 2)
  const pctW = showPct ? Math.max(...slices.map((s) => ctx.measureText(pctOf(s), pctStyle).width)) * TEXT_SLACK : 0
  const labelW = Math.max(maxNameW, pctW)
  const outsideAll = mode === 'outside'
  const colMargin = labelW + 26
  const vMargin = outsideAll || wantsInside ? lh * 1.1 : 6
  let R = Math.min((area.width - (outsideAll || wantsInside ? 2 * colMargin : 0)) / 2, (area.height - 2 * vMargin) / 2)
  if (!(R > 12)) R = Math.max(6, Math.min(area.width, area.height) / 2 - 6)
  const cx = area.x + area.width / 2
  const cy = area.y + area.height / 2

  // The part of the ring a donut `total` leaves open.
  if (total > sum) {
    const end = arcs[arcs.length - 1].a1
    const rest = start + FULL - end
    if (rest > 0.01) nodes.push(pathNode(ctx, ringArcPath(cx, cy, R, R * hole, end, end + rest), 'track', { fill: c.track }))
  }

  // Slices.
  slices.forEach((s, i) => {
    const a = arcs[i]
    nodes.push({
      ...pathNode(ctx, ringArcPath(cx, cy, R, R * hole, a.a0, a.a1), `slice[${i}]`, { fill: colorOf(s, i), ...(slices.length > 1 || total > sum ? { stroke: c.surface, strokeWidth: 3 } : {}) }),
    })
  })

  // Donut centre: one value (and a caption) inside the hole, shrunk to fit it.
  if (hole > 0 && extra?.centre?.value) {
    const inner = R * hole * 2 * 0.78
    const base = style(ctx, 'heading', c.text)
    const k = Math.min(1, Math.max(0.45, inner / Math.max(1, realWidth(extra.centre.value, base) * 1.04)))
    const vs = k < 1 ? { ...base, size: base.size * k } : base
    const cap = extra.centre.label ? style(ctx, 'caption', c.muted) : undefined
    const capK = cap ? Math.min(1, Math.max(0.55, inner / Math.max(1, realWidth(extra.centre.label as string, cap) * 1.04))) : 1
    const cs = cap && capK < 1 ? { ...cap, size: cap.size * capK } : cap
    const total2 = lineH(vs) + (cs ? lineH(cs) : 0)
    const y0 = cy - total2 / 2
    nodes.push(...textAligned(ctx, extra.centre.value, vs, { x: cx - inner / 2, y: y0, width: inner }, 'center', 'centre').nodes.slice(0, 1))
    if (cs && extra.centre.label) nodes.push(...textAligned(ctx, extra.centre.label, cs, { x: cx - inner / 2, y: y0 + lineH(vs), width: inner }, 'center', 'centre.label').nodes.slice(0, 1))
  }

  // Labels.
  const outside: number[] = []
  slices.forEach((s, i) => {
    if (mode === 'legend') return
    if (wantsInside) {
      const rm = hole > 0 ? (R + R * hole) / 2 : R * 0.64
      const chord = 2 * rm * Math.sin(Math.min(arcs[i].span, Math.PI) / 2)
      const nameM = ctx.measureText(s.name, nameStyle).width * TEXT_SLACK
      const need = Math.max(nameM, pctW)
      const height = lh * (showPct ? 2 : 1)
      if (arcs[i].span > 0.3 && chord >= need && rm >= height * 0.6) {
        const ink = onColor(ctx, colorOf(s, i))
        const tx = cx + rm * Math.cos(arcs[i].mid)
        const ty = cy + rm * Math.sin(arcs[i].mid) - height / 2
        nodes.push(...textAligned(ctx, s.name, { ...nameStyle, color: ink }, { x: tx - need / 2, y: ty, width: need }, 'center', `label[${i}]`).nodes)
        if (showPct) nodes.push(...textAligned(ctx, pctOf(s), { ...pctStyle, color: ink }, { x: tx - need / 2, y: ty + lh, width: need }, 'center', `label[${i}].pct`).nodes)
        return
      }
    }
    outside.push(i)
  })

  if (outside.length > 0) {
    // Dry-run each label at y = 0 to learn its real height (name lines + percent line).
    const nameTxt = outside.map((i) => clipLines(ctx.measureText(slices[i].name, nameStyle, Math.max(1, labelW)).lines, 2).map((l) => l.text).join(' '))
    const dry = outside.map((_, k) => textAligned(ctx, nameTxt[k], nameStyle, { x: 0, y: 0, width: Math.max(1, labelW) }, 'start', 'x'))
    const hOf = (k: number) => dry[k].height + (showPct ? lh : 0)
    const maxH = Math.max(...outside.map((_, k) => hOf(k)))
    for (const side of [1, -1]) {
      const ks = outside.map((i, k) => ({ i, k })).filter(({ i }) => (Math.cos(arcs[i].mid) >= 0 ? 1 : -1) === side)
      if (ks.length === 0) continue
      const ys = directLabel(
        ks.map(({ i }) => ({ y: cy + Math.sin(arcs[i].mid) * (R + 14) - maxH / 2 })),
        { x: 0, y: area.y, width: 1, height: area.height },
        { labelHeight: maxH, gap: 4 }
      )
      ks.forEach(({ i, k }, j) => {
        const a = arcs[i].mid
        const p0 = { x: cx + R * 0.96 * Math.cos(a), y: cy + R * 0.96 * Math.sin(a) }
        const p1 = { x: cx + (R + 12) * Math.cos(a), y: cy + (R + 12) * Math.sin(a) }
        const colX = side === 1 ? cx + R + 20 : cx - R - 20
        const p2 = { x: colX, y: ys[j] + maxH / 2 }
        nodes.push(pathNode(ctx, `M${p0.x} ${p0.y}L${p1.x} ${p1.y}L${p2.x} ${p2.y}`, `label[${i}].leader`, { stroke: c.line, strokeWidth: 2 }))
        const bx = side === 1 ? colX + 6 : colX - 6 - labelW
        const align = side === 1 ? 'start' : 'end'
        const y0 = ys[j] + (maxH - hOf(k)) / 2
        const nameH = hOf(k) - (showPct ? lh : 0)
        const t = textAligned(ctx, nameTxt[k], nameStyle, { x: bx, y: y0, width: labelW }, align, `label[${i}]`)
        nodes.push(...t.nodes.slice(0, 2))
        if (showPct) nodes.push(...textAligned(ctx, pctOf(slices[i]), pctStyle, { x: bx, y: y0 + nameH, width: labelW }, align, `label[${i}].pct`).nodes)
      })
    }
  }
  return root(ctx, nodes)
}

export function lint(props: PieProps): LintFinding[] {
  const n = Math.max(asArr(props.categories).length, asArr(props.values).length)
  return n > PIE_MAX_SLICES
    ? [{ level: 'warning', rule: 'chart/too-many-slices', part: 'slice', message: `A pie of ${n} slices is hard to read: group the small slices as Other (max ${PIE_MAX_SLICES}).` }]
    : []
}

export function capacity(props: PieProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf(
    { slices: { max: PIE_MAX_SLICES, used: Math.max(asArr(props.categories).length, asArr(props.values).length) } },
    true,
    [{ kind: 'truncate', slot: 'categories' }]
  )
}

