/**
 * Pure layout for tls.g.milestones — diamond markers on a line, done ones filled.
 *
 * Horizontal: evenly spaced markers; with `alternate` the date and label sit on alternating sides
 * (so each can be twice as wide), with `below` the date is above the line and the label below.
 * Vertical: dates left, labels right; with `alternate` the pairs swap sides of a central line.
 * The line is filled up to the last done milestone.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { MilestonesProps } from './schema'
import { MILESTONES_MAX } from './schema'
import { asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, objs, pathNode, placeLines, root, solidRect, str, style } from '../_kit'
import { around, shapeSlot, slot } from '../_motion'

const R = 14

export function layout(props: MilestonesProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = objs(props.items)
    .slice(0, MILESTONES_MAX)
    .map((m) => ({ date: str(m.date), label: str(m.label), done: m.done === true }))
  const N = items.length
  if (N < 1) return emptyState(ctx, 'No milestones')
  const c = chartColors(ctx)
  const vertical = enumOf(props.axis, ['horizontal', 'vertical'] as const, 'horizontal') === 'vertical'
  const alt = enumOf(props.labels, ['alternate', 'below'] as const, 'alternate') === 'alternate'
  const dateS = style(ctx, 'footnote', c.accent)
  const labelS = style(ctx, 'caption', c.text)
  const lastDone = items.reduce((m, it, i) => (it.done ? i : m), -1)
  const nodes: LayoutNode[] = []
  const f = (v: number) => String(Math.round(v * 100) / 100)

  const marker = (i: number, cx: number, cy: number) => {
    const d = `M${f(cx)} ${f(cy - R)}L${f(cx + R)} ${f(cy)}L${f(cx)} ${f(cy + R)}L${f(cx - R)} ${f(cy)}Z`
    nodes.push(
      items[i].done
        ? pathNode(ctx, d, `ms[${i}]`, { fill: c.accent })
        : pathNode(ctx, d, `ms[${i}]`, { fill: c.surface, stroke: c.accent, strokeWidth: 3 })
    )
  }

  if (!vertical) {
    const p = W / N
    const y = H / 2
    const x = (i: number) => p * (i + 0.5)
    nodes.push(solidRect({ x: 0, y: y - 2, width: W, height: 4 }, c.track, 'line'))
    if (lastDone >= 0) nodes.push(solidRect({ x: 0, y: y - 2, width: Math.max(0, x(lastDone)), height: 4 }, c.accent, 'line.progress'))
    const sideH = Math.max(0, H / 2 - R - 8)
    items.forEach((it, i) => {
      const cx = x(i)
      const full = alt ? 2 * p - 12 : p - 8
      const w = Math.max(8, Math.min(full, 2 * Math.min(cx, W - cx)))
      const left = cx - w / 2
      marker(i, cx, y)
      const dh = it.date ? lineH(dateS) : 0
      if (alt) {
        const above = i % 2 === 1
        const ll = Math.max(1, Math.min(2, Math.floor((sideH - dh - 2) / lineH(labelS))))
        const lh = linesHeight(ctx, it.label, labelS, w, ll)
        const total = dh + (dh ? 2 : 0) + lh
        let top = above ? y - R - 8 - total : y + R + 8
        if (dh) {
          nodes.push(...placeLines(ctx, it.date, dateS, { x: left, y: top, width: w }, 'center', 1, `date[${i}]`).nodes)
          top += dh + 2
        }
        nodes.push(...placeLines(ctx, it.label, labelS, { x: left, y: top, width: w }, 'center', ll, `label[${i}]`).nodes)
      } else {
        if (dh) nodes.push(...placeLines(ctx, it.date, dateS, { x: left, y: y - R - 8 - dh, width: w }, 'center', 1, `date[${i}]`).nodes)
        const ll = Math.max(1, Math.min(2, Math.floor(sideH / lineH(labelS))))
        nodes.push(...placeLines(ctx, it.label, labelS, { x: left, y: y + R + 8, width: w }, 'center', ll, `label[${i}]`).nodes)
      }
    })
  } else {
    const p = H / N
    const y = (i: number) => p * (i + 0.5)
    const ax = alt ? W / 2 : clamp(W * 0.2, 90, 220) + 20
    nodes.push(solidRect({ x: ax - 2, y: y(0), width: 4, height: Math.max(0, y(N - 1) - y(0)) }, c.track, 'line'))
    if (lastDone >= 0) nodes.push(solidRect({ x: ax - 2, y: y(0), width: 4, height: Math.max(0, y(lastDone) - y(0)) }, c.accent, 'line.progress'))
    items.forEach((it, i) => {
      const cy = y(i)
      marker(i, ax, cy)
      if (!alt) {
        const dW = Math.max(8, ax - R - 12)
        nodes.push(...placeLines(ctx, it.date, dateS, { x: 0, y: cy - lineH(dateS) / 2, width: dW }, 'end', 1, `date[${i}]`).nodes)
        const x0 = ax + R + 12
        const ll = Math.max(1, Math.min(2, Math.floor((p - 2) / lineH(labelS))))
        const lh = linesHeight(ctx, it.label, labelS, W - x0, ll)
        nodes.push(...placeLines(ctx, it.label, labelS, { x: x0, y: cy - lh / 2, width: Math.max(8, W - x0) }, 'start', ll, `label[${i}]`).nodes)
      } else {
        const right = i % 2 === 0
        const w = Math.max(8, W / 2 - R - 12)
        const dh = it.date ? lineH(dateS) : 0
        // Symmetric budget around the row centre keeps same-side neighbours (2 rows apart) clear.
        const budget = Math.max(lineH(labelS), 2 * Math.min(cy, H - cy, p - 4))
        const ll = Math.max(1, Math.min(2, Math.floor((budget - dh - 2) / lineH(labelS))))
        const lh = linesHeight(ctx, it.label, labelS, w, ll)
        const total = dh + (dh ? 2 : 0) + lh
        let top = clamp(cy - total / 2, 0, Math.max(0, H - total))
        const x0 = right ? ax + R + 12 : 0
        const al = right ? 'start' : 'end'
        if (dh) {
          nodes.push(...placeLines(ctx, it.date, dateS, { x: x0, y: top, width: w }, al, 1, `date[${i}]`).nodes)
          top += dh + 2
        }
        nodes.push(...placeLines(ctx, it.label, labelS, { x: x0, y: top, width: w }, al, ll, `label[${i}]`).nodes)
      }
    })
  }
  return root(ctx, slotMilestones(nodes, N, vertical, W, H))
}

/**
 * RVM4: motion slots. The line and its progress fill wipe as one along the axis (`rail-x` /
 * `rail-y`), each diamond sits in a tight group (`gem[i]`) so it settles about its own centre,
 * and each milestone's date + label share one slot (`cap[i]`, emitted for every milestone, so a
 * missing date never shifts the later ones). Leaf names and positions are unchanged.
 */
function slotMilestones(nodes: LayoutNode[], N: number, vertical: boolean, W: number, H: number): LayoutNode[] {
  const rail = nodes.filter((n) => n.part === 'line' || n.part === 'line.progress')
  const caps: LayoutNode[][] = Array.from({ length: N }, () => [])
  const out: LayoutNode[] = [around(vertical ? 'rail-y' : 'rail-x', rail)]
  for (const n of nodes) {
    if (rail.includes(n)) continue
    const m = /^(ms|date|label)\[(\d+)\]$/.exec(n.part ?? '')
    if (m && m[1] === 'ms') out.push(shapeSlot(`gem[${m[2]}]`, n))
    else if (m) caps[Number(m[2])].push(n)
    else out.push(n)
  }
  return [...out, ...caps.map((kids, i) => slot(`cap[${i}]`, { width: W, height: H }, kids))]
}

export function capacity(props: MilestonesProps, box: Size, ctx: LayoutContext): CapacityReport {
  const n = asArr(props.items).length
  const alt = props.labels !== 'below'
  const lh = ctx.resolveText('caption').size * ctx.resolveText('caption').lineHeight
  const ok = props.axis === 'vertical' ? n < 2 || box.height / n >= (alt ? 30 : lh + 6) : n < 2 || (alt ? 2 : 1) * (box.width / n) >= 120
  return capacityOf({ items: { max: MILESTONES_MAX, used: n } }, ok, [
    { kind: 'reflow', to: 'axis: vertical' },
    { kind: 'truncate', slot: 'items' },
  ])
}
