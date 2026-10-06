/**
 * Pure layout for tls.g.timeline — dated events along one axis.
 *
 * Each event is a node on the axis plus a card (date, title, optional note) joined by a short stem.
 * Horizontal: cards sit below the axis, or alternate above/below. The card width is solved so that
 * neighbouring cards on the same side never touch (`(W - g(N-1)) / N`, or `(2W - g(N-1)) / (N+1)`
 * when alternating); the first and last cards are centred on the first and last node, which are
 * inset by half a card. Vertical: date column on the left, cards on the right, or alternating
 * left/right of a central axis. Events after `nowIndex` are muted and the axis is only filled
 * up to the latest event reached.
 *
 * Text is clipped by line count to the height the row/side allows; nothing overflows the box.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { iconLeaf } from '../../text/_engine/icon'
import type { TimelineProps } from './schema'
import { TIMELINE_MAX } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, mutedStyle, numOrNull, objs, onColor, placeLines, root, solidRect, str, style, tintOf,
} from '../_kit'

export const MIN_CARD_W = 180
const GAP = 14
const MAX_CARD_W = 280
const STEM = 14

type Mode = { vertical: boolean; alternate: boolean }

/** Card width that keeps same-side neighbours apart; the spec's `capacity` minimum is MIN_CARD_W. */
export function horizontalCardWidth(W: number, n: number, alternate: boolean): number {
  const raw = alternate ? (2 * W - GAP * (n - 1)) / (n + 1) : (W - GAP * (n - 1)) / Math.max(1, n)
  return Math.min(MAX_CARD_W, raw)
}

export function layout(props: TimelineProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const events = objs(props.events)
    .slice(0, TIMELINE_MAX)
    .map((e) => ({ date: str(e.date), title: str(e.title), text: str(e.text), icon: typeof e.icon === 'string' && e.icon ? e.icon : '' }))
  const N = events.length
  if (N < 1) return emptyState(ctx, 'No events')

  const c = chartColors(ctx)
  const mode: Mode = { vertical: enumOf(props.axis, ['horizontal', 'vertical'] as const, 'horizontal') === 'vertical', alternate: props.alternate === true }
  const nodeStyle = enumOf(props.nodeStyle, ['dot', 'icon', 'number'] as const, 'dot')
  const showText = isShown(props, 'showText')
  const rawNow = numOrNull(props.nowIndex)
  const now = rawNow !== null && Math.round(rawNow) >= 0 ? Math.min(N - 1, Math.round(rawNow)) : -1
  const past = (i: number) => now < 0 || i <= now

  const dateS = style(ctx, 'footnote', c.accent)
  const titleS = style(ctx, 'caption', c.text)
  const textS = mutedStyle(ctx, 'footnote')
  const D = nodeStyle === 'dot' ? 18 : nodeStyle === 'icon' ? 44 : 40
  const nodes: LayoutNode[] = []

  const nodeFill = (i: number) => (past(i) ? c.accent : c.track)
  const drawNode = (i: number, nx: number, ny: number) => {
    const fill = nodeFill(i)
    const ring = nodeStyle === 'dot'
    nodes.push({
      k: 'rect',
      part: `node[${i}]`,
      box: { x: nx - D / 2, y: ny - D / 2, width: D, height: D },
      fill: { type: 'solid', color: fill },
      radius: D / 2,
      ...(ring ? { stroke: { color: c.surface, width: 3 } } : {}),
    })
    if (nodeStyle === 'icon' && events[i].icon) {
      nodes.push(iconLeaf(events[i].icon, { x: nx - D * 0.3, y: ny - D * 0.3, width: D * 0.6, height: D * 0.6 }, onColor(ctx, fill), `icon[${i}]`))
    } else if (nodeStyle !== 'dot') {
      nodes.push(...placeLines(ctx, String(i + 1), { ...titleS, color: onColor(ctx, fill) }, { x: nx - D / 2, y: ny - lineH(titleS) / 2, width: D }, 'center', 1, `num[${i}]`).nodes)
    }
  }

  /** Date / title / note stack in `box`, at most `maxH` tall; returns its height. */
  const drawCard = (i: number, box: { x: number; y: number; width: number }, align: 'start' | 'center' | 'end', maxH: number, anchor: 'top' | 'bottom', withDate: boolean): number => {
    const e = events[i]
    const dim = !past(i)
    const dS = dim ? { ...dateS, color: c.muted } : dateS
    const tS = dim ? { ...titleS, color: c.muted } : titleS
    const w = Math.max(8, box.width)
    let dh = withDate && e.date ? lineH(dS) : 0
    // Not even date + one title line fit: drop the date rather than overflow.
    if (dh && dh + 2 + lineH(tS) > maxH + 0.5) dh = 0
    const titleLines = Math.max(1, Math.min(2, Math.floor((maxH - (dh ? dh + 2 : 0)) / lineH(tS))))
    const th = linesHeight(ctx, e.title, tS, w, titleLines)
    const room = maxH - dh - (dh ? 2 : 0) - th - 4
    const nl = showText && e.text ? Math.max(0, Math.min(5, Math.floor((room + 1) / lineH(textS)))) : 0
    const xh = nl > 0 ? linesHeight(ctx, e.text, textS, w, nl) : 0
    const total = dh + (dh ? 2 : 0) + th + (xh ? 4 + xh : 0)
    let y = anchor === 'top' ? box.y : box.y - total
    const inner = { x: box.x, width: w }
    const group: LayoutNode[] = []
    if (dh) {
      group.push(...placeLines(ctx, e.date, dS, { ...inner, y }, align, 1, `date[${i}]`).nodes)
      y += dh + 2
    }
    group.push(...placeLines(ctx, e.title, tS, { ...inner, y }, align, titleLines, `title[${i}]`).nodes)
    y += th
    if (xh) group.push(...placeLines(ctx, e.text, textS, { ...inner, y: y + 4 }, align, nl, `text[${i}]`).nodes)
    nodes.push(...group)
    return total
  }

  if (!mode.vertical) {
    const cardW = Math.max(60, horizontalCardWidth(W, N, mode.alternate))
    const span = Math.max(0, W - cardW)
    const x = (i: number) => (N === 1 ? W / 2 : cardW / 2 + (span * i) / (N - 1))
    const stemColor = (i: number) => (past(i) ? c.accent : c.track)
    let axisY: number
    let cardsH: number
    if (mode.alternate) {
      axisY = H / 2
      cardsH = Math.max(0, (H - D) / 2 - STEM)
    } else {
      const allowed = Math.max(0, H - D - STEM)
      const measure = (i: number) => {
        const e = events[i]
        return (e.date ? lineH(dateS) + 2 : 0) + linesHeight(ctx, e.title, titleS, cardW, 2) + (showText && e.text ? 4 + linesHeight(ctx, e.text, textS, cardW, 5) : 0)
      }
      cardsH = Math.min(allowed, Math.max(...events.map((_, i) => measure(i))))
      axisY = Math.max(D / 2, (H - (D + STEM + cardsH)) / 2 + D / 2)
    }
    nodes.push(solidRect({ x: 0, y: axisY - 2, width: W, height: 4 }, c.track, 'axis'))
    if (now >= 0) nodes.push(solidRect({ x: 0, y: axisY - 2, width: Math.max(0, x(now)), height: 4 }, c.accent, 'axis.progress'))
    for (let i = 0; i < N; i++) {
      const nx = x(i)
      const above = mode.alternate && i % 2 === 0
      const left = clamp(nx - cardW / 2, 0, Math.max(0, W - cardW))
      if (above) {
        nodes.push(solidRect({ x: nx - 1, y: axisY - D / 2 - STEM, width: 2, height: STEM }, stemColor(i), `stem[${i}]`))
        drawCard(i, { x: left, y: axisY - D / 2 - STEM - 2, width: cardW }, 'center', cardsH, 'bottom', true)
      } else {
        nodes.push(solidRect({ x: nx - 1, y: axisY + D / 2, width: 2, height: STEM }, stemColor(i), `stem[${i}]`))
        drawCard(i, { x: left, y: axisY + D / 2 + STEM + 2, width: cardW }, 'center', Math.max(0, cardsH), 'top', true)
      }
      drawNode(i, nx, axisY)
    }
  } else {
    const pitch = Math.max(1, H / N)
    const nodeY = (i: number) => i * pitch + Math.max(D / 2, lineH(titleS) / 2 + 2)
    if (!mode.alternate) {
      const dW = clamp(W * 0.16, 70, 200)
      const ax = dW + 12 + D / 2
      const cardX = ax + D / 2 + 16
      nodes.push(solidRect({ x: ax - 2, y: nodeY(0), width: 4, height: Math.max(0, nodeY(N - 1) - nodeY(0)) }, c.track, 'axis'))
      if (now >= 0) nodes.push(solidRect({ x: ax - 2, y: nodeY(0), width: 4, height: Math.max(0, nodeY(now) - nodeY(0)) }, c.accent, 'axis.progress'))
      for (let i = 0; i < N; i++) {
        const ny = nodeY(i)
        const dS = past(i) ? dateS : { ...dateS, color: c.muted }
        nodes.push(...placeLines(ctx, events[i].date, dS, { x: 0, y: ny - lineH(dS) / 2, width: dW }, 'end', 1, `date[${i}]`).nodes)
        const top = ny - Math.max(D / 2, lineH(titleS) / 2)
        drawCard(i, { x: cardX, y: top, width: Math.max(8, W - cardX) }, 'start', Math.max(0, Math.min(pitch - 6, H - top)), 'top', false)
        drawNode(i, ax, ny)
      }
    } else {
      const ax = W / 2
      const cardW = Math.max(8, W / 2 - D / 2 - 16)
      nodes.push(solidRect({ x: ax - 2, y: nodeY(0), width: 4, height: Math.max(0, nodeY(N - 1) - nodeY(0)) }, c.track, 'axis'))
      if (now >= 0) nodes.push(solidRect({ x: ax - 2, y: nodeY(0), width: 4, height: Math.max(0, nodeY(now) - nodeY(0)) }, c.accent, 'axis.progress'))
      for (let i = 0; i < N; i++) {
        const ny = nodeY(i)
        const top = Math.max(0, ny - D / 2)
        const maxH = Math.max(0, Math.min(2 * pitch - 8, H - top))
        if (i % 2 === 0) drawCard(i, { x: ax + D / 2 + 16, y: top, width: cardW }, 'start', maxH, 'top', true)
        else drawCard(i, { x: 0, y: top, width: cardW }, 'end', maxH, 'top', true)
        drawNode(i, ax, ny)
      }
    }
  }
  return root(ctx, nodes)
}

export function capacity(props: TimelineProps, box: Size, ctx: LayoutContext): CapacityReport {
  void ctx
  const n = asArr(props.events).length
  const vertical = props.axis === 'vertical'
  const alt = props.alternate === true
  let widthOk = true
  if (!vertical) widthOk = n < 2 || horizontalCardWidth(box.width, n, alt) >= MIN_CARD_W
  else widthOk = n < 1 || box.height / Math.max(1, n) >= (alt ? 60 : 84) * 0.8
  const remedy: CapacityReport['remedy'] = []
  if (!vertical) remedy.push({ kind: 'reflow', to: alt ? 'axis: vertical' : 'alternate: true' })
  remedy.push({ kind: 'truncate', slot: 'events' })
  return capacityOf({ events: { max: TIMELINE_MAX, used: n } }, widthOk, remedy)
}
