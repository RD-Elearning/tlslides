/**
 * Pure layout for tls.g.chevrons — N arrow-shaped segments in a row, tails nested into heads.
 *
 * Label (and, with textPlacement `inside`, the note) is centred in the chevron; with `below` the note
 * sits in a column under each chevron. One phase can be highlighted: it keeps its full colour while
 * the others become a light tint of theirs. Fill is the accent -> accent2 ramp, one accent, or the
 * categorical ramp. A label steps its type down to show whole (3 lines) before an ellipsis; past five steps in a
 * box tall enough the chevrons take two rows (S24-i, S24-j).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { chevronPath } from '../../../layout/diagram'
import type { ChevronsProps } from './schema'
import { CHEVRONS_MAX } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, emptyState, enumOf, fitTier, linesHeight, linesNeeded, lineH, mutedStyle, numOrNull, objs, onColor, pathNode, placeLines, rampColor, root, str, style, tintOf,
} from '../_kit'
import { shapeSlot } from '../_motion'

const PAD = 10
const GAP = 6
const MIN_CHEVRON_W = 96
/** AC3 pre-item: the roomy tier (subheading labels, body notes inside or lead notes below, taller
 *  chevrons) for chevrons alone in a tall box; the block fills its box, so the tier follows H. */
const ROOMY_MIN_H = 480
const ROOMY_MIN_CW = 300
const ROOMY_PAD = 24

interface Geo {
  N: number
  notch: number
  cw: number
  chevH: number
  chevY: number
  pitch: number
}

function geometry(W: number, H: number, N: number, contentH: number, below: boolean, belowH: number, roomy = false): Geo {
  const wantH = roomy ? clamp(contentH + 2 * ROOMY_PAD, below ? 200 : 160, 280) : clamp(contentH + 2 * PAD, 84, 200)
  const room = below ? Math.max(1, H - belowH) : H
  const chevH = Math.max(1, Math.min(room, wantH))
  const notch = clamp(Math.min(chevH * 0.28, W / (N * 2.6)), 6, 40)
  const cw = (W + (N - 1) * (notch - GAP)) / N
  const total = below ? chevH + belowH : chevH
  return { N, notch, cw, chevH, chevY: Math.max(0, (H - total) / 2), pitch: cw - notch + GAP }
}

/** Most chevrons one row draws at a reading size (S24-j: seven drew 22-unit labels, T37). */
export const ROW_MAX = 5
/** Height a box needs for two rows of chevrons (two 84-unit rows, their padding and the gap). */
const TWO_ROW_MIN_H = 300
const ROW_GAP = 28
/** Label lines a chevron may take before its type steps down (S24-i: labels were cut at two lines). */
const LABEL_LINES = 3

type Step = { label: string; text: string }

export function layout(props: ChevronsProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const steps = objs(props.steps)
    .slice(0, CHEVRONS_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text) }))
  const N = steps.length
  if (N < 1) return emptyState(ctx, 'No steps')
  if (N > ROW_MAX && H >= TWO_ROW_MIN_H) {
    // two rows, the first one longer; the colours, parts and the current phase keep their deck-wide index
    const k = Math.ceil(N / 2)
    const rowH = (H - ROW_GAP) / 2
    return root(ctx, [...row(props, ctx, steps, 0, k, N, W, rowH, 0, H), ...row(props, ctx, steps, k, N, N, W, rowH, rowH + ROW_GAP, H)])
  }
  return root(ctx, row(props, ctx, steps, 0, N, N, W, H, 0, H))
}

function row(props: ChevronsProps, ctx: LayoutContext, all: Step[], from: number, to: number, total: number, W: number, H: number, y0: number, boxH: number): LayoutNode[] {
  const steps = all.slice(from, to)
  const N = steps.length
  const c = chartColors(ctx)
  const mode = enumOf(props.fill, ['gradient', 'single', 'series'] as const, 'gradient')
  const placement = enumOf(props.textPlacement, ['inside', 'below'] as const, 'inside')
  const showText = isShown(props, 'showText') && all.some((s) => s.text)
  const rawCur = numOrNull(props.currentIndex)
  const cur = rawCur !== null && Math.round(rawCur) >= 0 && Math.round(rawCur) < total ? Math.round(rawCur) : -1
  const below = placement === 'below' && showText
  // the roomy tier follows the block's box (two rows of a tall box are each under ROOMY_MIN_H)
  const roomy = boxH >= ROOMY_MIN_H && (W + (N - 1) * (40 - GAP)) / N >= ROOMY_MIN_CW
  const textS = mutedStyle(ctx, roomy ? (below ? 'lead' : 'body') : 'footnote')

  // Provisional geometry (content height is measured at the final widths below).
  let g = geometry(W, H, N, lineH(style(ctx, 'caption', c.text)) * 2, below, 0, roomy)
  const insideW = (i: number) => Math.max(8, g.cw - (i === 0 ? PAD : g.notch + 4) - (g.notch + 2))
  // the largest label type at which every label shows whole in LABEL_LINES lines (S24-i: no ellipsis while a smaller
  // size would show the words)
  // (a short row takes body labels when they fit its height: seven caption labels read at ≈ 6 px in a contact sheet)
  const tiers = roomy ? (below ? ['heading', 'subheading', 'body', 'caption'] as const : ['subheading', 'body', 'caption'] as const) : ['body', 'caption', 'footnote'] as const
  const room = below ? H * 0.6 : H
  const labelS = style(ctx, fitTier(tiers, (t) => {
    const ts = style(ctx, t, c.text)
    const need = steps.map((s, i) => linesNeeded(ctx, s.label, ts, insideW(i)))
    return need.every((n) => n <= LABEL_LINES) && Math.max(...need) * lineH(ts) + 2 * PAD <= Math.min(room, roomy ? 280 : 200)
  }, ctx), c.text)
  const maxLabelH = Math.max(...steps.map((s, i) => linesHeight(ctx, s.label, labelS, insideW(i), LABEL_LINES)))
  const maxTextH = showText && !below ? Math.max(...steps.map((s, i) => linesHeight(ctx, s.text, textS, insideW(i), 4))) : 0
  let belowH = 0
  if (below) {
    const colW = Math.max(8, g.pitch - 8)
    belowH = Math.max(...steps.map((s) => linesHeight(ctx, s.text, textS, colW, 4))) + (roomy ? 28 : 14)
  }
  g = geometry(W, H, N, maxLabelH + (maxTextH ? maxTextH + 4 : 0), below, belowH, roomy)
  g = { ...g, chevY: g.chevY + y0 }

  const nodes: LayoutNode[] = []
  steps.forEach((s, j) => {
    const i = from + j // the step's index in the whole block
    const x = j * g.pitch
    const box = { x, y: g.chevY, width: g.cw, height: g.chevH }
    const ramp = rampColor(ctx, mode, i, total)
    const active = cur < 0 || i === cur
    // The current phase is the brand accent (or its series colour), never a mid-ramp blend.
    const fill = i === cur ? (mode === 'series' ? ramp : c.accent) : active ? ramp : tintOf(c.surface, ramp, 0.22)
    const ink = active ? onColor(ctx, fill) : c.text
    // RVM4: each chevron sits in its own tight `seg[i]` group so its wipe runs over the shape.
    nodes.push(shapeSlot(`seg[${i}]`, pathNode(ctx, chevronPath(box, g.notch, j === 0, false), `chevron[${i}]`, { fill })))

    const left = x + (j === 0 ? PAD : g.notch + 4)
    const w = insideW(j)
    const lh = linesHeight(ctx, s.label, labelS, w, LABEL_LINES)
    const th = showText && !below ? linesHeight(ctx, s.text, textS, w, 4) : 0
    const blockH = lh + (th ? 4 + th : 0)
    let y = g.chevY + Math.max(0, (g.chevH - blockH) / 2)
    nodes.push(...placeLines(ctx, s.label, { ...labelS, color: ink }, { x: left, y, width: w }, 'center', LABEL_LINES, `label[${i}]`).nodes)
    y += lh + (th ? 4 : 0)
    if (th) {
      const noteInk = active ? ink : c.muted
      nodes.push(...placeLines(ctx, s.text, { ...textS, color: noteInk }, { x: left, y, width: w }, 'center', 4, `text[${i}]`).nodes)
    }
    if (below && s.text) {
      const colW = Math.max(8, g.pitch - 8)
      const cx = x + g.cw / 2
      nodes.push(...placeLines(ctx, s.text, active ? { ...textS, color: c.text } : textS, { x: cx - colW / 2, y: g.chevY + g.chevH + (roomy ? 24 : 12), width: colW }, 'center', 4, `text[${i}]`).nodes)
    }
  })
  return nodes
}

export function capacity(props: ChevronsProps, box: Size, ctx: LayoutContext): CapacityReport {
  void ctx
  const n = asArr(props.steps).length
  const notch = clamp(Math.min(84 * 0.28, box.width / (Math.max(1, n) * 2.6)), 6, 40)
  const cw = (box.width + (Math.max(1, n) - 1) * (notch - GAP)) / Math.max(1, n)
  const widthOk = cw >= MIN_CHEVRON_W
  const report = capacityOf({ steps: { max: CHEVRONS_MAX, used: n } }, widthOk, [
    { kind: 'reflow', to: 'tls.g.steps' },
    { kind: 'truncate', slot: 'steps' },
  ])
  return report
}
