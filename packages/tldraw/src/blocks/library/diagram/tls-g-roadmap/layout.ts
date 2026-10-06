/**
 * Pure layout for tls.g.roadmap — period columns, one band per lane, a bar per item.
 *
 * Bars span `start` .. `end + 1` columns (end is inclusive, fractions allowed). A label that does
 * not fit inside its bar is drawn outside it on the right (or on the left at the right edge). Bars
 * of one lane that collide, label included, are stacked in sub-rows and the lane grows. Rows are
 * scaled to the box height (down to a floor, then `capacity` says it does not fit). Status colours
 * are done positive, active accent, planned neutral, risk negative; with `statusColors` off each
 * lane gets one colour from the categorical ramp. A small legend names the statuses in use.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { RoadmapProps } from './schema'
import { ROADMAP_MAX_ITEMS, ROADMAP_MAX_LANES, ROADMAP_MAX_PERIODS, STATUSES } from './schema'
import {
  TEXT_SLACK, asArr, capacityOf, chartColors, clamp, emptyState, enumOf, lineH, mutedStyle, numOrNull, objs, onColor, placeLines, rampColor, root, solidRect, str, style, tintOf,
} from '../_kit'

type Status = (typeof STATUSES)[number]

interface Plan {
  P: number
  lanes: Array<{
    name: string
    items: Array<{ label: string; s: number; e: number; status: Status; row: number; outside: 'none' | 'right' | 'left'; labelW: number }>
    rows: number
  }>
  used: Status[]
}

const BAR_H = 28
const SUB_GAP = 8
const LANE_PAD = 8
const LABEL_PAD = 8

function status(v: unknown): Status {
  return (STATUSES as readonly string[]).includes(String(v)) ? (v as Status) : 'planned'
}

/** Normalise props, pick label sides and pack sub-rows. Depends only on widths, not heights. */
function plan(props: RoadmapProps, ctx: LayoutContext, W: number, gx0: number, labelS: ReturnType<typeof style>): Plan {
  const periods = asArr(props.periods).slice(0, ROADMAP_MAX_PERIODS)
  const P = Math.max(1, periods.length)
  const colW = Math.max(1, (W - gx0) / P)
  const used = new Set<Status>()
  const lanes = objs(props.lanes)
    .slice(0, ROADMAP_MAX_LANES)
    .map((lane) => {
      const rawItems = objs(lane.items).slice(0, ROADMAP_MAX_ITEMS)
      const items = rawItems
        .map((it) => {
          const a = clamp(numOrNull(it.start) ?? 0, 0, P - 1)
          const b = clamp(numOrNull(it.end) ?? a, 0, P - 1)
          const s = Math.min(a, b)
          const e = Math.max(a, b)
          const label = str(it.label)
          const st = status(it.status)
          used.add(st)
          const x0 = gx0 + s * colW
          const x1 = gx0 + (e + 1) * colW
          const tw = ctx.measureText(label, labelS).width * TEXT_SLACK
          const insideFits = tw + 2 * LABEL_PAD <= x1 - x0
          let outside: 'none' | 'right' | 'left' = 'none'
          if (!insideFits && label) outside = x1 + 6 + tw <= W ? 'right' : x0 - 6 - tw >= gx0 ? 'left' : 'none'
          const lo = outside === 'left' ? x0 - 6 - tw : x0
          const hi = outside === 'right' ? x1 + 6 + tw : x1
          return { label, s, e, status: st, row: 0, outside, labelW: tw, lo, hi }
        })
        .sort((p, q) => p.lo - q.lo || p.hi - q.hi)
      const ends: number[] = []
      for (const it of items) {
        let r = ends.findIndex((end) => end <= it.lo + 0.01)
        if (r < 0) {
          r = ends.length
          ends.push(0)
        }
        ends[r] = it.hi
        it.row = r
      }
      return { name: str(lane.name), items, rows: Math.max(1, ends.length) }
    })
  return { P, lanes, used: STATUSES.filter((s) => used.has(s)) }
}

const laneHeight = (rows: number, barH: number, gap: number, pad: number) => rows * barH + (rows - 1) * gap + 2 * pad

export function layout(props: RoadmapProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const periods = asArr(props.periods).slice(0, ROADMAP_MAX_PERIODS).map(str)
  if (periods.length < 1) return emptyState(ctx, 'No periods')
  const c = chartColors(ctx)
  const colored = props.statusColors !== false
  const laneLabels = enumOf(props.laneLabels, ['left', 'none'] as const, 'left') === 'left'
  const labelS = style(ctx, 'footnote', c.text)
  const nameS = style(ctx, 'caption', c.text)
  const periodS = mutedStyle(ctx, 'footnote')

  // Lane column.
  const rawNames = objs(props.lanes).slice(0, ROADMAP_MAX_LANES).map((l) => str(l.name))
  const widest = Math.max(0, ...rawNames.map((n) => ctx.measureText(n, nameS).width * TEXT_SLACK))
  const laneW = laneLabels ? clamp(widest + 16, 70, Math.max(70, W * 0.22)) : 0
  const gx0 = laneW
  const pl = plan(props, ctx, W, gx0, labelS)
  const P = pl.P
  const colW = Math.max(1, (W - gx0) / P)

  const headerH = lineH(periodS) + 10
  const legendH = colored && pl.used.length > 0 ? lineH(labelS) + 12 : 0
  const avail = Math.max(1, H - headerH - legendH)
  const sum0 = pl.lanes.reduce((a, l) => a + laneHeight(l.rows, BAR_H, SUB_GAP, LANE_PAD), 0)
  const f = sum0 > 0 ? clamp(avail / sum0, 0.5, 1.8) : 1
  const minBar = Math.ceil(lineH(labelS))
  const barH = Math.max(minBar, BAR_H * f)
  const gap = SUB_GAP * Math.min(1, f)
  const pad = Math.max(2, LANE_PAD * Math.min(1, f))
  const laneHs = pl.lanes.map((l) => laneHeight(l.rows, barH, gap, pad))
  const totalH = laneHs.reduce((a, b) => a + b, 0)
  const bodyBottom = headerH + totalH

  const nodes: LayoutNode[] = []
  const laneColor = (li: number) => rampColor(ctx, 'series', li, pl.lanes.length)
  const statusFill = (st: Status, li: number): string => {
    if (!colored) return laneColor(li)
    return st === 'done' ? ctx.resolveColor('positive').color : st === 'active' ? c.accent : st === 'risk' ? ctx.resolveColor('negative').color : ctx.resolveColor('neutral').color
  }

  // Lane bands.
  let y = headerH
  pl.lanes.forEach((l, li) => {
    if (li % 2 === 0) nodes.push(solidRect({ x: 0, y, width: W, height: laneHs[li] }, tintOf(c.surface, c.line, 0.18), `lane[${li}]`))
    if (laneLabels && l.name) {
      const nm = placeLines(ctx, l.name, nameS, { x: 8, y: y + Math.max(0, (laneHs[li] - lineH(nameS)) / 2), width: Math.max(8, laneW - 12) }, 'start', 1, `lane[${li}].name`)
      nodes.push(...nm.nodes)
    }
    y += laneHs[li]
  })

  // Grid lines and period headers.
  for (let j = 0; j <= P; j++) {
    nodes.push(solidRect({ x: Math.min(W - 1, gx0 + j * colW), y: headerH - 4, width: 1, height: Math.max(0, bodyBottom - headerH + 4) }, tintOf(c.surface, c.line, 0.7), `grid[${j}]`))
  }
  periods.forEach((p, j) => {
    nodes.push(...placeLines(ctx, p, periodS, { x: gx0 + j * colW + 2, y: (headerH - lineH(periodS)) / 2 - 2, width: Math.max(4, colW - 4) }, 'center', 1, `period[${j}]`).nodes)
  })

  // Bars.
  y = headerH
  pl.lanes.forEach((l, li) => {
    l.items.forEach((it, ii) => {
      const x0 = gx0 + it.s * colW
      const x1 = gx0 + (it.e + 1) * colW
      const by = y + pad + it.row * (barH + gap)
      const fill = statusFill(it.status, li)
      nodes.push({ k: 'rect', part: `bar[${li}][${ii}]`, box: { x: x0 + 1, y: by, width: Math.max(0, x1 - x0 - 2), height: barH }, fill: { type: 'solid', color: fill }, radius: Math.min(6, barH / 2) })
      const ty = by + (barH - lineH(labelS)) / 2
      if (it.outside === 'none') {
        nodes.push(...placeLines(ctx, it.label, { ...labelS, color: onColor(ctx, fill) }, { x: x0 + LABEL_PAD, y: ty, width: Math.max(4, x1 - x0 - 2 * LABEL_PAD) }, 'start', 1, `bar[${li}][${ii}].label`).nodes)
      } else if (it.outside === 'right') {
        nodes.push(...placeLines(ctx, it.label, labelS, { x: x1 + 6, y: ty, width: Math.max(4, Math.min(W - x1 - 6, it.labelW)) }, 'start', 1, `bar[${li}][${ii}].label`).nodes)
      } else {
        const w = Math.max(4, Math.min(x0 - 6 - gx0, it.labelW))
        nodes.push(...placeLines(ctx, it.label, labelS, { x: x0 - 6 - w, y: ty, width: w }, 'end', 1, `bar[${li}][${ii}].label`).nodes)
      }
    })
    y += laneHs[li]
  })

  // Today marker.
  const today = numOrNull(props.todayAt)
  if (today !== null && today >= 0 && today <= P) {
    const tx = gx0 + today * colW
    nodes.push(solidRect({ x: clamp(tx - 1, 0, W - 2), y: headerH - 4, width: 2, height: Math.max(0, bodyBottom - headerH + 4) }, c.text, 'today'))
    nodes.push({ k: 'rect', part: 'today.dot', box: { x: clamp(tx - 5, 0, W - 10), y: headerH - 10, width: 10, height: 10 }, fill: { type: 'solid', color: c.text }, radius: 5 })
  }

  // Legend.
  if (legendH > 0) {
    let lx = gx0
    const ly = bodyBottom + 12
    const names: Record<Status, string> = { done: 'Done', active: 'In progress', planned: 'Planned', risk: 'At risk' }
    pl.used.forEach((st, k) => {
      const fill = statusFill(st, 0)
      const w = Math.ceil(ctx.measureText(names[st], labelS).width * TEXT_SLACK) + 2
      if (lx + 18 + w > W) return
      nodes.push({ k: 'rect', part: `legend[${k}]`, box: { x: lx, y: ly + (lineH(labelS) - 14) / 2, width: 14, height: 14 }, fill: { type: 'solid', color: fill }, radius: 3 })
      nodes.push(...placeLines(ctx, names[st], labelS, { x: lx + 20, y: ly, width: w }, 'start', 1, `legend[${k}].label`).nodes)
      lx += 20 + w + 18
    })
  }
  return root(ctx, nodes)
}

export function capacity(props: RoadmapProps, box: Size, ctx: LayoutContext): CapacityReport {
  const periods = asArr(props.periods).length
  const lanes = asArr(props.lanes).length
  const items = Math.max(0, ...objs(props.lanes).map((l) => asArr(l.items).length))
  const labelS = style(ctx, 'footnote')
  const periodS = mutedStyle(ctx, 'footnote')
  const laneLabels = props.laneLabels !== 'none'
  const nameS = style(ctx, 'caption')
  const widest = Math.max(0, ...objs(props.lanes).map((l) => ctx.measureText(str(l.name), nameS).width * TEXT_SLACK))
  const gx0 = laneLabels ? clamp(widest + 16, 70, Math.max(70, box.width * 0.22)) : 0
  const pl = plan(props, ctx, Math.max(1, box.width), gx0, labelS)
  const need = lineH(periodS) + 10 + (props.statusColors !== false && pl.used.length ? lineH(labelS) + 12 : 0) + pl.lanes.reduce((a, l) => a + laneHeight(l.rows, Math.ceil(lineH(labelS)), 4, 2), 0)
  const rows = Math.max(0, ...pl.lanes.map((l) => l.rows))
  const report = capacityOf(
    {
      periods: { max: ROADMAP_MAX_PERIODS, used: periods },
      lanes: { max: ROADMAP_MAX_LANES, used: lanes },
      items: { max: ROADMAP_MAX_ITEMS, used: items },
    },
    need <= box.height,
    [
      { kind: 'reflow', to: 'laneLabels: none' },
      { kind: 'truncate', slot: 'lanes' },
    ]
  )
  void rows
  return report
}
