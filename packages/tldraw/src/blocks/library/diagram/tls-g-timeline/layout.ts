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

import type { CapacityReport, LayoutContext, LayoutNode, Size, TypeToken } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { iconLeaf } from '../../text/_engine/icon'
import type { TimelineProps } from './schema'
import { TIMELINE_MAX } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, emptyState, enumOf, fitTier, linesHeight, linesNeeded, lineH, mutedStyle, numOrNull, objs, onColor, placeLines, root, solidRect, str, style, tintOf,
} from '../_kit'
import { around, slot } from '../_motion'

export const MIN_CARD_W = 180
const GAP = 14
const MAX_CARD_W = 280
const STEM0 = 14

type Mode = { vertical: boolean; alternate: boolean }

/** Card width that keeps same-side neighbours apart; the spec's `capacity` minimum is MIN_CARD_W. */
export function horizontalCardWidth(W: number, n: number, alternate: boolean, maxW = MAX_CARD_W): number {
  const raw = alternate ? (2 * W - GAP * (n - 1)) / (n + 1) : (W - GAP * (n - 1)) / Math.max(1, n)
  return Math.min(maxW, raw)
}

/**
 * Type tiers, largest first (2026-10-24 review: a timeline alone on a slide kept footnote dates and
 * notes in a box three times their height). The block takes the largest tier at which every
 * event shows its date, its whole title (one line at heading size, else two) and its whole note in
 * the box (`fitTier`); the last tier is the compact one it always had, and clips. `node` scales the
 * disc and the stem, `cardW` caps a horizontal card's width (longer lines at larger type).
 */
type Tier = { date: TypeToken; title: TypeToken; text: TypeToken; node: number; cardW: number; gap: number; titleLines: number; noteLines: number }
const TIERS: readonly Tier[] = [
  // a heading title only on one line (two lines of heading per event outweigh the axis)
  { date: 'lead', title: 'heading', text: 'lead', node: 1.8, cardW: 720, gap: 12, titleLines: 1, noteLines: 4 },
  { date: 'body', title: 'subheading', text: 'lead', node: 1.6, cardW: 620, gap: 10, titleLines: 2, noteLines: 4 },
  { date: 'body', title: 'subheading', text: 'body', node: 1.5, cardW: 520, gap: 8, titleLines: 2, noteLines: 4 },
  { date: 'caption', title: 'lead', text: 'body', node: 1.3, cardW: 460, gap: 6, titleLines: 2, noteLines: 4 },
  { date: 'caption', title: 'body', text: 'caption', node: 1.1, cardW: 360, gap: 4, titleLines: 2, noteLines: 5 },
  { date: 'footnote', title: 'caption', text: 'footnote', node: 1, cardW: MAX_CARD_W, gap: 2, titleLines: 2, noteLines: 5 },
]

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

  const D0 = nodeStyle === 'dot' ? 18 : nodeStyle === 'icon' ? 44 : 40
  const tier = fitTier(TIERS, (t) => fits(t, events, showText, mode, D0, W, H, ctx), ctx)
  const dateS = style(ctx, tier.date, c.accent)
  const titleS = style(ctx, tier.title, c.text)
  const textS = mutedStyle(ctx, tier.text)
  const D = D0 * tier.node
  const STEM = Math.round(STEM0 * (1 + (tier.node - 1) * 2))
  const cardGap = tier.gap
  const noteLines = tier.noteLines
  const nodes: LayoutNode[] = []
  const cards: LayoutNode[][] = events.map(() => [])

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
    // RVM4: the number / icon sits in a per-event slot (`mark[i]`), emitted for every event.
    const mark: LayoutNode[] = []
    if (nodeStyle === 'icon' && events[i].icon) {
      mark.push(iconLeaf(events[i].icon, { x: nx - D * 0.3, y: ny - D * 0.3, width: D * 0.6, height: D * 0.6 }, onColor(ctx, fill), `icon[${i}]`))
    } else if (nodeStyle !== 'dot') {
      mark.push(...placeLines(ctx, String(i + 1), { ...titleS, color: onColor(ctx, fill) }, { x: nx - D / 2, y: ny - lineH(titleS) / 2, width: D }, 'center', 1, `num[${i}]`).nodes)
    }
    nodes.push(slot(`mark[${i}]`, { width: W, height: H }, mark))
  }

  /** Date / title / note stack in `box`, at most `maxH` tall; returns its height. */
  const drawCard = (i: number, box: { x: number; y: number; width: number }, align: 'start' | 'center' | 'end', maxH: number, anchor: 'top' | 'bottom', withDate: boolean): number => {
    const e = events[i]
    const dim = !past(i)
    const dS = dim ? { ...dateS, color: c.muted } : dateS
    const tS = dim ? { ...titleS, color: c.muted } : titleS
    // text wraps a little inside the card: a face measured a hair wider than the table painted a
    // line past the block's edge from the last card (2026-10-24 corpus: 4–14 units)
    const w = Math.max(8, box.width * TEXT_FIT)
    const tx = align === 'start' ? box.x : align === 'end' ? box.x + box.width - w : box.x + (box.width - w) / 2
    let dh = withDate && e.date ? lineH(dS) : 0
    // Not even date + one title line fit: drop the date rather than overflow.
    if (dh && dh + cardGap + lineH(tS) > maxH + 0.5) dh = 0
    const titleLines = Math.max(1, Math.min(2, Math.floor((maxH - (dh ? dh + cardGap : 0)) / lineH(tS))))
    const th = linesHeight(ctx, e.title, tS, w, titleLines)
    const room = maxH - dh - (dh ? cardGap : 0) - th - 2 * cardGap
    const nl = showText && e.text ? Math.max(0, Math.min(noteLines, Math.floor((room + 1) / lineH(textS)))) : 0
    const xh = nl > 0 ? linesHeight(ctx, e.text, textS, w, nl) : 0
    const total = dh + (dh ? cardGap : 0) + th + (xh ? 2 * cardGap + xh : 0)
    let y = anchor === 'top' ? box.y : box.y - total
    const inner = { x: tx, width: w }
    const group: LayoutNode[] = []
    if (dh) {
      group.push(...placeLines(ctx, e.date, dS, { ...inner, y }, align, 1, `date[${i}]`).nodes)
      y += dh + cardGap
    }
    group.push(...placeLines(ctx, e.title, tS, { ...inner, y }, align, titleLines, `title[${i}]`).nodes)
    y += th
    if (xh) group.push(...placeLines(ctx, e.text, textS, { ...inner, y: y + 2 * cardGap }, align, nl, `text[${i}]`).nodes)
    // RVM4: the date / title / note of event i in its own slot (`card[i]`).
    cards[i].push(...group)
    return total
  }

  if (!mode.vertical) {
    const cardW = Math.max(60, horizontalCardWidth(W, N, mode.alternate, tier.cardW))
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
        return (e.date ? lineH(dateS) + cardGap : 0) + linesHeight(ctx, e.title, titleS, cardW, 2) + (showText && e.text ? 2 * cardGap + linesHeight(ctx, e.text, textS, cardW, noteLines) : 0)
      }
      cardsH = Math.min(allowed, Math.max(...events.map((_, i) => measure(i))))
      axisY = Math.max(D / 2, (H - (D + STEM + cardsH)) / 2 + D / 2)
    }
    // RVM4: the axis (and its progress fill) wipe left to right as one (`rail-x`).
    nodes.push(around('rail-x', [solidRect({ x: 0, y: axisY - 2, width: W, height: 4 }, c.track, 'axis'), ...(now >= 0 ? [solidRect({ x: 0, y: axisY - 2, width: Math.max(0, x(now)), height: 4 }, c.accent, 'axis.progress')] : [])]))
    for (let i = 0; i < N; i++) {
      const nx = x(i)
      const above = mode.alternate && i % 2 === 0
      const left = clamp(nx - cardW / 2, 0, Math.max(0, W - cardW))
      if (above) {
        nodes.push(solidRect({ x: nx - 1, y: axisY - D / 2 - STEM, width: 2, height: STEM }, stemColor(i), `stem[${i}]`))
        drawCard(i, { x: left, y: axisY - D / 2 - STEM - cardGap, width: cardW }, 'center', cardsH, 'bottom', true)
      } else {
        nodes.push(solidRect({ x: nx - 1, y: axisY + D / 2, width: 2, height: STEM }, stemColor(i), `stem[${i}]`))
        drawCard(i, { x: left, y: axisY + D / 2 + STEM + cardGap, width: cardW }, 'center', Math.max(0, cardsH), 'top', true)
      }
      drawNode(i, nx, axisY)
    }
  } else {
    const pitch = Math.max(1, H / N)
    const nodeY = (i: number) => i * pitch + Math.max(D / 2, lineH(titleS) / 2 + 2)
    if (!mode.alternate) {
      const dW = verticalDateWidth(W)
      const ax = dW + 12 + D / 2
      const cardX = ax + D / 2 + 16
      nodes.push(around('rail-y', [solidRect({ x: ax - 2, y: nodeY(0), width: 4, height: Math.max(0, nodeY(N - 1) - nodeY(0)) }, c.track, 'axis'), ...(now >= 0 ? [solidRect({ x: ax - 2, y: nodeY(0), width: 4, height: Math.max(0, nodeY(now) - nodeY(0)) }, c.accent, 'axis.progress')] : [])]))
      for (let i = 0; i < N; i++) {
        const ny = nodeY(i)
        const dS = past(i) ? dateS : { ...dateS, color: c.muted }
        cards[i].push(...placeLines(ctx, events[i].date, dS, { x: 0, y: ny - lineH(dS) / 2, width: dW }, 'end', 1, `date[${i}]`).nodes)
        const top = ny - Math.max(D / 2, lineH(titleS) / 2)
        drawCard(i, { x: cardX, y: top, width: Math.max(8, W - cardX) }, 'start', Math.max(0, Math.min(pitch - 6, H - top)), 'top', false)
        drawNode(i, ax, ny)
      }
    } else {
      const ax = W / 2
      const cardW = Math.max(8, W / 2 - D / 2 - 16)
      nodes.push(around('rail-y', [solidRect({ x: ax - 2, y: nodeY(0), width: 4, height: Math.max(0, nodeY(N - 1) - nodeY(0)) }, c.track, 'axis'), ...(now >= 0 ? [solidRect({ x: ax - 2, y: nodeY(0), width: 4, height: Math.max(0, nodeY(now) - nodeY(0)) }, c.accent, 'axis.progress')] : [])]))
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
  nodes.push(...cards.map((kids, i) => slot(`card[${i}]`, { width: W, height: H }, kids)))
  return root(ctx, nodes)
}

/** Share of a card's width its text wraps in (`drawCard` and `fits` agree). */
const TEXT_FIT = 0.97

/** The date column of a one-sided vertical timeline. */
const verticalDateWidth = (W: number) => clamp(W * 0.16, 70, 220)

type Ev = { date: string; title: string; text: string }

/**
 * Whether `tier` shows every event whole in the box: the date on one line, the title in at most
 * two lines, the note in `noteLines`, and the cards within the height `layout` gives them.
 */
function fits(tier: Tier, events: Ev[], showText: boolean, mode: Mode, D0: number, W: number, H: number, ctx: LayoutContext): boolean {
  const dS = style(ctx, tier.date)
  const tS = style(ctx, tier.title)
  const xS = mutedStyle(ctx, tier.text)
  const D = D0 * tier.node
  const STEM = Math.round(STEM0 * (1 + (tier.node - 1) * 2))
  const g = tier.gap
  const N = events.length
  /** Height of one card at width `w` (with or without its date), `Infinity` when a part is cut. */
  const cardH = (e: Ev, w: number, withDate: boolean) => {
    if (withDate && e.date && linesNeeded(ctx, e.date, dS, w) > 1) return Infinity
    const tl = linesNeeded(ctx, e.title, tS, w)
    const xl = showText && e.text ? linesNeeded(ctx, e.text, xS, w) : 0
    if (tl > tier.titleLines || xl > tier.noteLines) return Infinity
    return (withDate && e.date ? lineH(dS) + g : 0) + tl * lineH(tS) + (xl ? 2 * g + xl * lineH(xS) : 0)
  }
  if (!mode.vertical) {
    const w = horizontalCardWidth(W, N, mode.alternate, tier.cardW) * TEXT_FIT
    // the compact tier's own floor; a larger tier needs at least its card width's worth of words
    if (w < MIN_CARD_W * TEXT_FIT) return false
    const h = Math.max(...events.map((e) => cardH(e, w, true)))
    return mode.alternate ? h <= (H - D) / 2 - STEM - g : D + STEM + g + h <= H
  }
  const pitch = H / Math.max(1, N)
  if (!mode.alternate) {
    const dW = verticalDateWidth(W)
    if (events.some((e) => e.date && linesNeeded(ctx, e.date, dS, dW) > 1)) return false
    const w = (W - (dW + 12 + D + 16)) * TEXT_FIT
    // the last card hangs below its node, so the box holds N pitches of cards
    return w > 0 && events.every((e) => cardH(e, w, false) <= pitch - 6)
  }
  const w = (W / 2 - D / 2 - 16) * TEXT_FIT
  return w > 0 && events.every((e) => cardH(e, w, true) <= Math.min(2 * pitch - 8, pitch * 1.6))
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
