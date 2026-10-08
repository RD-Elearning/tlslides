/**
 * Pure layout for tls.d.ranking — a leaderboard: rank, name (with an optional note), a value bar
 * and the value. The top three get medal discs (gold / silver / bronze derived from the warning,
 * neutral and negative roles, never hex). Bars start at zero and share one scale; a negative
 * value draws no bar. `sort` decides the order (the rank follows the order shown).
 *
 * Parts: `row[i].rank` (+ `.num`), `row[i].label`, `row[i].note`, `row[i].track`, `row[i].bar`,
 * `row[i].value`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { RankingProps } from './schema'
import { RANKING_MAX_ITEMS } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, clipLines, dot, emptyState, enumOf, fmtNum, lineH, mutedStyle, numOrNull, onColor, root, solidRect, str, style, textAligned, tintOf, TEXT_SLACK,
} from '../_chart/kit'
import { withNumberMetrics } from '../_table/kit'

const MIN_ROW = 68
const MAX_ROW = 92

interface Entry {
  label: string
  value: number
  note: string
}

function read(props: RankingProps): Entry[] {
  const items = asArr<Record<string, unknown>>(props.items)
    .slice(0, RANKING_MAX_ITEMS)
    .map((it) => ({ label: str(it?.label), value: numOrNull(it?.value), note: str(it?.note) }))
    .filter((it): it is Entry => it.value !== null)
  const sort = enumOf(props.sort, ['desc', 'asc', 'none'] as const, 'desc')
  if (sort === 'desc') return items.map((x, i) => ({ x, i })).sort((a, b) => b.x.value - a.x.value || a.i - b.i).map((e) => e.x)
  if (sort === 'asc') return items.map((x, i) => ({ x, i })).sort((a, b) => a.x.value - b.x.value || a.i - b.i).map((e) => e.x)
  return items
}

export function layout(props: RankingProps, ctx0: LayoutContext): LayoutNode {
  const ctx = withNumberMetrics(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = read(props)
  if (items.length === 0) return emptyState(ctx)

  const c = chartColors(ctx)
  const sp = ctx.tokens.space
  const ls = style(ctx, 'body', c.text)
  const ns = mutedStyle(ctx, 'footnote')
  const vs = style(ctx, 'body', c.text)
  const lh = lineH(ls)
  const showBars = props.showBars !== false
  const medals = props.medals !== false
  const n = items.length
  const rowH = clamp(H / n, MIN_ROW, MAX_ROW)
  const y0 = Math.max(0, (H - n * rowH) / 2)
  const disc = Math.min(Math.round(lh * 1.15), rowH - 8)
  const rankW = disc
  const valueTexts = items.map((it) => fmtNum(it.value, props.format))
  const valueW = Math.ceil(Math.max(...valueTexts.map((t) => ctx.measureText(t, vs).width)) * TEXT_SLACK) + 2
  const labelMax = Math.max(...items.map((it) => ctx.measureText(it.label, ls).width), ...items.map((it) => ctx.measureText(it.note, ns).width))
  const gap = sp.sm
  const hasBars = showBars
  const labelW = Math.max(40, Math.min(hasBars ? W * 0.34 : W - rankW - valueW - gap * 3, Math.ceil(labelMax * TEXT_SLACK) + 2))
  const lx = rankW + gap
  const bx = lx + labelW + gap
  const bw = Math.max(0, W - bx - valueW - gap)
  const max = Math.max(...items.map((it) => it.value), 0)
  const gold = ctx.resolveColor('warning').color
  const silver = ctx.resolveColor('neutral').color
  const bronze = tintOf(gold, ctx.resolveColor('negative').color, 0.55)
  const medalFill = [gold, silver, bronze]
  const nodes: LayoutNode[] = []

  items.forEach((it, i) => {
    const y = y0 + i * rowH
    const cy = y + rowH / 2
    // Rank: a medal disc for the top three, a plain muted number otherwise.
    const rankText = String(i + 1)
    if (medals && i < 3) {
      const fill = medalFill[i]
      nodes.push(dot(rankW / 2, cy, disc / 2, fill, `row[${i}].rank`))
      const ink = onColor(ctx, fill)
      nodes.push(...textAligned(ctx, rankText, { ...vs, color: ink }, { x: 0, y: cy - lh / 2, width: rankW }, 'center', `row[${i}].rank.num`).nodes.slice(0, 1))
    } else {
      nodes.push(...textAligned(ctx, rankText, mutedStyle(ctx, 'body'), { x: 0, y: cy - lh / 2, width: rankW }, 'center', `row[${i}].rank`).nodes.slice(0, 1))
    }
    // Name and note.
    const lm = ctx.measureText(it.label, ls, labelW)
    const lines = clipLines(lm.lines, 1)
    const hasNote = it.note.length > 0
    const noteH = hasNote ? lineH(ns) : 0
    const top = cy - (lh + noteH) / 2
    nodes.push({ k: 'text', part: `row[${i}].label`, box: { x: lx, y: top, width: labelW, height: lh }, lines, style: ls })
    if (hasNote) {
      const nm = ctx.measureText(it.note, ns, labelW)
      nodes.push({ k: 'text', part: `row[${i}].note`, box: { x: lx, y: top + lh, width: labelW, height: noteH }, lines: clipLines(nm.lines, 1), style: ns })
    }
    // Bar on a quiet track.
    if (hasBars && bw > 2) {
      const bh = Math.max(6, Math.min(18, rowH * 0.3))
      nodes.push(solidRect({ x: bx, y: cy - bh / 2, width: bw, height: bh }, c.track, `row[${i}].track`, bh / 2))
      const w = max > 0 && it.value > 0 ? Math.max(bh, (bw * it.value) / max) : 0
      if (w > 0) nodes.push(solidRect({ x: bx, y: cy - bh / 2, width: Math.min(bw, w), height: bh }, i === 0 ? c.accent : tintOf(c.surface, c.accent, 0.62), `row[${i}].bar`, bh / 2))
    }
    nodes.push(...textAligned(ctx, valueTexts[i], vs, { x: W - valueW, y: cy - lh / 2, width: valueW }, 'end', `row[${i}].value`).nodes.slice(0, 1))
  })
  return root(ctx, nodes)
}

export function capacity(props: RankingProps, box: Size, ctx: LayoutContext): CapacityReport {
  void ctx
  const used = asArr(props.items).length
  const rows = Math.max(1, Math.floor(box.height / MIN_ROW))
  return capacityOf({ items: { max: Math.min(RANKING_MAX_ITEMS, rows), used } }, used <= rows, [{ kind: 'truncate', slot: 'items' }, { kind: 'paginate' }])
}
