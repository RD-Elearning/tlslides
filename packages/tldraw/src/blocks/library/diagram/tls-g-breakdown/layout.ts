/**
 * Pure layout for tls.g.breakdown — a whole box, a curly brace, and 2 to 6 part cards.
 *
 * `LR`: the whole sits left, centred on the parts column, the brace between them points back at it.
 * `TB`: the whole sits on top and the parts form a row under a horizontal brace. Each part shows a
 * label, a value and a note; `showShare` adds the part's percentage of the sum when every value
 * parses as a number (currency symbols, thousands separators, k/M/B suffixes and % are understood).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { BreakdownProps } from './schema'
import { BREAKDOWN_MAX } from './schema'
import { asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, onColor, pathNode, placeLines, rampColor, root, str, style, tintOf } from '../_kit'

const GAP = 12

/** "$40k", "1,200", "25%", "3.5M" -> number; anything else -> null. */
export function parseAmount(v: string): number | null {
  const m = /^\s*[^\d.\-+]*([-+]?\d[\d,]*(?:\.\d+)?)\s*([kKmMbB]?)\s*[%a-zA-Z]{0,3}\s*$/.exec(v)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  if (!Number.isFinite(n)) return null
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase() as 'k' | 'm' | 'b'] ?? 1
  return n * mult
}

export function shares(values: string[]): number[] | null {
  const nums = values.map(parseAmount)
  if (nums.some((n) => n === null || n < 0)) return null
  const sum = (nums as number[]).reduce((a, b) => a + b, 0)
  return sum > 0 ? (nums as number[]).map((n) => (n / sum) * 100) : null
}

/** A curly brace over `length` along u, tip `depth` away along -v (toward the whole). */
export function bracePath(length: number, depth: number, map: (u: number, v: number) => { x: number; y: number }): string {
  const r = Math.max(1, Math.min(depth / 2, length / 4))
  const D = depth
  const L = length
  const f = (v: number) => String(Math.round(v * 100) / 100)
  const P = (u: number, v: number) => {
    const p = map(u, v)
    return `${f(p.x)} ${f(p.y)}`
  }
  return [
    `M${P(0, 0)}`,
    `Q${P(0, -D / 2)} ${P(r, -D / 2)}`,
    `L${P(L / 2 - r, -D / 2)}`,
    `Q${P(L / 2, -D / 2)} ${P(L / 2, -D)}`,
    `Q${P(L / 2, -D / 2)} ${P(L / 2 + r, -D / 2)}`,
    `L${P(L - r, -D / 2)}`,
    `Q${P(L, -D / 2)} ${P(L, 0)}`,
  ].join('')
}

export function layout(props: BreakdownProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const wholeObj = objs([props.whole])[0] ?? {}
  const parts = objs(props.parts)
    .slice(0, BREAKDOWN_MAX)
    .map((p) => ({ label: str(p.label), value: str(p.value), note: str(p.note) }))
  const N = parts.length
  if (N < 1 || !str(wholeObj.label)) return emptyState(ctx, 'Add a whole and its parts')
  const c = chartColors(ctx)
  const tb = enumOf(props.direction, ['LR', 'TB'] as const, 'LR') === 'TB'
  const share = props.showShare === true ? shares(parts.map((p) => p.value)) : null
  const labelS = style(ctx, 'caption', c.text)
  const valueS = style(ctx, 'subheading', c.text)
  const noteS = mutedStyle(ctx, 'footnote')
  const nodes: LayoutNode[] = []

  const whole = { label: str(wholeObj.label), value: str(wholeObj.value) }
  const wholeFill = c.accent
  const wholeInk = onColor(ctx, wholeFill)

  const drawWhole = (box: { x: number; y: number; width: number; height: number }) => {
    const out: LayoutNode[] = [{ k: 'rect', part: 'whole[card]', box, fill: { type: 'solid', color: wholeFill }, radius: 16 }]
    const pad = 12
    const w = Math.max(10, box.width - 2 * pad)
    const vl = whole.value ? clamp(Math.floor((box.height - 2 * pad) / lineH(valueS)) - 1, 0, 1) : 0
    const ll = clamp(Math.floor((box.height - 2 * pad - vl * lineH(valueS)) / lineH(labelS)), 1, 2)
    const lh = linesHeight(ctx, whole.label, labelS, w, ll)
    const vh = vl ? linesHeight(ctx, whole.value, valueS, w, 1) : 0
    const top = box.y + (box.height - (lh + (vh ? 4 + vh : 0))) / 2
    out.push(...placeLines(ctx, whole.label, { ...labelS, color: wholeInk }, { x: box.x + pad, y: top, width: w }, 'center', ll, 'whole[label]').nodes)
    if (vh) out.push(...placeLines(ctx, whole.value, { ...valueS, color: wholeInk }, { x: box.x + pad, y: top + lh + 4, width: w }, 'center', 1, 'whole[value]').nodes)
    nodes.push({ k: 'group', part: 'whole', box: { x: 0, y: 0, width: W, height: H }, children: out })
  }

  const drawPart = (i: number, box: { x: number; y: number; width: number; height: number }) => {
    const p = parts[i]
    const color = rampColor(ctx, 'gradient', i, N)
    const out: LayoutNode[] = [{ k: 'rect', part: `part[${i}].card`, box, fill: { type: 'solid', color: tintOf(c.surface, color, 0.16) }, stroke: { color, width: 2 }, radius: 14 }]
    const pad = box.height < 56 ? 6 : 12
    const iw = Math.max(10, box.width - 2 * pad)
    const pct = share ? `${Math.round(share[i])}%` : ''
    if (!tb) {
      // label + note on the left, value (and share) on the right
      const vw = p.value ? Math.min(iw * 0.4, 170) : 0
      const lw = Math.max(10, iw - vw - (vw ? 12 : 0))
      const nl = p.note && box.height - 2 * Math.min(pad, 6) >= lineH(labelS) + lineH(noteS) ? Math.min(2, Math.floor((box.height - 2 * Math.min(pad, 6) - lineH(labelS)) / lineH(noteS))) : 0
      const lh = linesHeight(ctx, p.label, labelS, lw, 1)
      const nh = nl ? linesHeight(ctx, p.note, noteS, lw, nl) : 0
      const top = box.y + (box.height - (lh + (nh ? 2 + nh : 0))) / 2
      out.push(...placeLines(ctx, p.label, labelS, { x: box.x + pad, y: top, width: lw }, 'start', 1, `part[${i}].label`).nodes)
      if (nh) out.push(...placeLines(ctx, p.note, noteS, { x: box.x + pad, y: top + lh + 2, width: lw }, 'start', nl, `part[${i}].note`).nodes)
      if (vw) {
        // Short rows drop the value to the caption size so it still fits the card.
        const vS = box.height - 2 * Math.min(pad, 6) >= lineH(valueS) ? valueS : labelS
        const vh = linesHeight(ctx, p.value, vS, vw, 1)
        const showPct = pct && box.height - 2 * Math.min(pad, 6) >= vh + lineH(noteS)
        const total = vh + (showPct ? lineH(noteS) : 0)
        const vt = box.y + (box.height - total) / 2
        out.push(...placeLines(ctx, p.value, { ...vS, color: c.text }, { x: box.x + box.width - pad - vw, y: vt, width: vw }, 'end', 1, `part[${i}].value`).nodes)
        if (showPct) out.push(...placeLines(ctx, pct, noteS, { x: box.x + box.width - pad - vw, y: vt + vh, width: vw }, 'end', 1, `part[${i}].share`).nodes)
      } else if (pct) out.push(...placeLines(ctx, pct, noteS, { x: box.x + box.width - pad - 60, y: box.y + (box.height - lineH(noteS)) / 2, width: 60 }, 'end', 1, `part[${i}].share`).nodes)
    } else {
      // stacked: label, value, share, note
      let y = box.y + pad
      const bottom = box.y + box.height - pad
      const put = (text: string, s: typeof labelS, maxLines: number, name: string, color?: string) => {
        if (!text || bottom - y < lineH(s)) return
        const ml = clamp(Math.min(maxLines, Math.floor((bottom - y) / lineH(s))), 1, maxLines)
        const pl = placeLines(ctx, text, color ? { ...s, color } : s, { x: box.x + pad, y, width: iw }, 'center', ml, name)
        out.push(...pl.nodes)
        y += pl.height + 4
      }
      put(p.label, labelS, 2, `part[${i}].label`)
      put(p.value, valueS, 1, `part[${i}].value`)
      put(pct, noteS, 1, `part[${i}].share`)
      put(p.note, noteS, 3, `part[${i}].note`)
    }
    nodes.push({ k: 'group', part: `part[${i}]`, box: { x: 0, y: 0, width: W, height: H }, children: out })
  }

  if (!tb) {
    const wholeW = clamp(W * 0.26, 120, 300)
    const braceW = clamp(W * 0.06, 36, 64)
    const px = wholeW + braceW + 24
    const pw = Math.max(40, W - px)
    const rowH = Math.min(110, Math.max(24, (H - (N - 1) * GAP) / N))
    const total = N * rowH + (N - 1) * GAP
    const y0 = Math.max(0, (H - total) / 2)
    const cy = y0 + total / 2
    const wh = Math.min(H, Math.max(90, Math.min(240, total)))
    drawWhole({ x: 0, y: cy - wh / 2, width: wholeW, height: wh })
    const depth = braceW - 8
    const xRef = px - 10
    nodes.push({ k: 'group', part: 'bracket', box: { x: 0, y: 0, width: W, height: H }, children: [pathNode(ctx, bracePath(total, depth, (u, v) => ({ x: xRef + v, y: y0 + u })), 'bracket[path]', { stroke: c.muted, strokeWidth: 3 })] })
    for (let i = 0; i < N; i++) drawPart(i, { x: px, y: y0 + i * (rowH + GAP), width: pw, height: rowH })
  } else {
    const wholeH = clamp(H * 0.22, 60, 120)
    const wholeW = clamp(W * 0.4, 160, 380)
    const braceH = clamp(H * 0.1, 28, 56)
    const py = wholeH + braceH + 20
    const ph = Math.max(40, H - py)
    const cw = Math.max(20, (W - (N - 1) * GAP) / N)
    drawWhole({ x: (W - wholeW) / 2, y: 0, width: wholeW, height: wholeH })
    const yRef = py - 10
    nodes.push({ k: 'group', part: 'bracket', box: { x: 0, y: 0, width: W, height: H }, children: [pathNode(ctx, bracePath(W, braceH - 8, (u, v) => ({ x: u, y: yRef + v })), 'bracket[path]', { stroke: c.muted, strokeWidth: 3 })] })
    for (let i = 0; i < N; i++) drawPart(i, { x: i * (cw + GAP), y: py, width: cw, height: ph })
  }
  return root(ctx, nodes)
}

export function capacity(props: BreakdownProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ parts: { max: BREAKDOWN_MAX, used: asArr(props.parts).length } }, true, [
    { kind: 'truncate', slot: 'parts' },
    { kind: 'reflow', to: 'tls.g.tree' },
  ])
}
