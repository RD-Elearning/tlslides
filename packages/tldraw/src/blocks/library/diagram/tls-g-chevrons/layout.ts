/**
 * Pure layout for tls.g.chevrons — N arrow-shaped segments in a row, tails nested into heads.
 *
 * Label (and, with textPlacement `inside`, the note) is centred in the chevron; with `below` the note
 * sits in a column under each chevron. One phase can be highlighted: it keeps its full colour while
 * the others become a light tint of theirs. Fill is the accent -> accent2 ramp, one accent, or the
 * categorical ramp. Text is clipped with an ellipsis, never overflows.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { chevronPath } from '../../../layout/diagram'
import type { ChevronsProps } from './schema'
import { CHEVRONS_MAX } from './schema'
import {
  asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, mutedStyle, numOrNull, objs, onColor, pathNode, placeLines, rampColor, root, str, style, tintOf,
} from '../_kit'
import { shapeSlot } from '../_motion'

const PAD = 10
const GAP = 6
const MIN_CHEVRON_W = 96

interface Geo {
  N: number
  notch: number
  cw: number
  chevH: number
  chevY: number
  pitch: number
}

function geometry(W: number, H: number, N: number, contentH: number, below: boolean, belowH: number): Geo {
  const wantH = clamp(contentH + 2 * PAD, 84, 200)
  const room = below ? Math.max(1, H - belowH) : H
  const chevH = Math.max(1, Math.min(room, wantH))
  const notch = clamp(Math.min(chevH * 0.28, W / (N * 2.6)), 6, 40)
  const cw = (W + (N - 1) * (notch - GAP)) / N
  const total = below ? chevH + belowH : chevH
  return { N, notch, cw, chevH, chevY: Math.max(0, (H - total) / 2), pitch: cw - notch + GAP }
}

export function layout(props: ChevronsProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const steps = objs(props.steps)
    .slice(0, CHEVRONS_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text) }))
  const N = steps.length
  if (N < 1) return emptyState(ctx, 'No steps')

  const c = chartColors(ctx)
  const mode = enumOf(props.fill, ['gradient', 'single', 'series'] as const, 'gradient')
  const placement = enumOf(props.textPlacement, ['inside', 'below'] as const, 'inside')
  const showText = isShown(props, 'showText') && steps.some((s) => s.text)
  const rawCur = numOrNull(props.currentIndex)
  const cur = rawCur !== null && Math.round(rawCur) >= 0 && Math.round(rawCur) < N ? Math.round(rawCur) : -1
  const labelS = style(ctx, 'caption', c.text)
  const textS = mutedStyle(ctx, 'footnote')
  const below = placement === 'below' && showText

  // Provisional geometry (content height is measured at the final widths below).
  let g = geometry(W, H, N, lineH(labelS) * 2, below, 0)
  const insideW = (i: number) => Math.max(8, g.cw - (i === 0 ? PAD : g.notch + 4) - (g.notch + 2))
  const maxLabelH = Math.max(...steps.map((s, i) => linesHeight(ctx, s.label, labelS, insideW(i), 2)))
  const maxTextH = showText && !below ? Math.max(...steps.map((s, i) => linesHeight(ctx, s.text, textS, insideW(i), 4))) : 0
  let belowH = 0
  if (below) {
    const colW = Math.max(8, g.pitch - 8)
    belowH = Math.max(...steps.map((s) => linesHeight(ctx, s.text, textS, colW, 4))) + 14
  }
  g = geometry(W, H, N, maxLabelH + (maxTextH ? maxTextH + 4 : 0), below, belowH)

  const nodes: LayoutNode[] = []
  steps.forEach((s, i) => {
    const x = i * g.pitch
    const box = { x, y: g.chevY, width: g.cw, height: g.chevH }
    const ramp = rampColor(ctx, mode, i, N)
    const active = cur < 0 || i === cur
    // The current phase is the brand accent (or its series colour), never a mid-ramp blend.
    const fill = i === cur ? (mode === 'series' ? ramp : c.accent) : active ? ramp : tintOf(c.surface, ramp, 0.22)
    const ink = active ? onColor(ctx, fill) : c.text
    // RVM4: each chevron sits in its own tight `seg[i]` group so its wipe runs over the shape.
    nodes.push(shapeSlot(`seg[${i}]`, pathNode(ctx, chevronPath(box, g.notch, i === 0, false), `chevron[${i}]`, { fill })))

    const left = x + (i === 0 ? PAD : g.notch + 4)
    const w = insideW(i)
    const lh = linesHeight(ctx, s.label, labelS, w, 2)
    const th = showText && !below ? linesHeight(ctx, s.text, textS, w, 4) : 0
    const blockH = lh + (th ? 4 + th : 0)
    let y = g.chevY + Math.max(0, (g.chevH - blockH) / 2)
    nodes.push(...placeLines(ctx, s.label, { ...labelS, color: ink }, { x: left, y, width: w }, 'center', 2, `label[${i}]`).nodes)
    y += lh + (th ? 4 : 0)
    if (th) {
      const noteInk = active ? ink : c.muted
      nodes.push(...placeLines(ctx, s.text, { ...textS, color: noteInk }, { x: left, y, width: w }, 'center', 4, `text[${i}]`).nodes)
    }
    if (below && s.text) {
      const colW = Math.max(8, g.pitch - 8)
      const cx = x + g.cw / 2
      nodes.push(...placeLines(ctx, s.text, active ? { ...textS, color: c.text } : textS, { x: cx - colW / 2, y: g.chevY + g.chevH + 12, width: colW }, 'center', 4, `text[${i}]`).nodes)
    }
  })
  return root(ctx, nodes)
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
